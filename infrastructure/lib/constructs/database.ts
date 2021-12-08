import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as lambda from "@aws-cdk/aws-lambda";
import * as rds from "@aws-cdk/aws-rds";
import * as iam from "@aws-cdk/aws-iam";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as customResources from "@aws-cdk/custom-resources";
import * as util from "../util";
import { ApiFlexFunction } from "./lambda-fn";

export interface DatabaseProps {
  vpc: ec2.IVpc;
  databaseName: string;
}

interface BootstrapProps extends DatabaseProps {
  secretName: string;
  cluster: rds.IDatabaseCluster;
}

type ConnectableResource = iam.IGrantable & ec2.IConnectable;

/**
 * The users on the database that map to particular access levels.
 * These get defined during the custom resource that performs the
 * initial bootstrapping of the database.
 */
enum DatabaseUsers {
  READ = "atat_api_read",
  WRITE = "atat_api_write",
  ADMIN = "atat_api_admin",
}

class DatabaseBootstrapper extends cdk.Construct {
  public readonly bootstrapResource: cdk.CustomResource;
  public readonly backingLambda: lambda.IFunction;
  constructor(scope: cdk.Construct, id: string, props: BootstrapProps) {
    super(scope, id);

    const handler = new ApiFlexFunction(this, "Function", {
      handlerPath: util.packageRoot() + "/rds/initial-bootstrap.ts",
      lambdaVpc: props.vpc,
      functionPropsOverride: {
        memorySize: 1024,
        timeout: cdk.Duration.minutes(5),
      },
    });

    this.bootstrapResource = new cdk.CustomResource(this, "CustomResource", {
      serviceToken: handler.fn.functionArn,
      properties: {
        DatabaseName: props.databaseName,
        DatabaseHost: props.cluster.clusterEndpoint.hostname,
        DatabaseSecretName: props.secretName,
        ForceReload: new Date().toUTCString(),
      },
    });
    this.bootstrapResource.node.addDependency(handler);
    this.backingLambda = handler.fn;
  }
}

/**
 * A highly-opinionated RDS configuration.
 *
 * Builds an Aurora PostgreSQL database with various security settings as well as
 * automatic bootstrapping of an underlying database.
 */
export class Database extends cdk.Construct {
  /**
   * The underlying Aurora cluster.
   */
  public readonly cluster: rds.DatabaseCluster;
  /**
   * The Secret resource for the Aurora cluster's master user.
   */
  public readonly adminSecret: secretsmanager.ISecret;
  /**
   * A way to identify whether the database has actually been created on the Aurora host.
   *
   * Any resource that needs to connect to the database for any operation should depend
   * directly on this. It is not guaranteed that the database or users will be created and
   * properly configured prior to this resource being complete.
   */
  // Using a ConcreteDependable means that we can change the underlying definition of what it
  // means for this to be "ready" without having to update the API. We just need to add/change
  // resources in the ConcreteDependable.
  public readonly databaseReady: cdk.ConcreteDependable;

  public readonly clusterResourceId: string;

  public readonly databaseName: string;

  constructor(scope: cdk.Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    this.databaseName = props.databaseName;

    const dbEngine = rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_13_4 });
    const parameters = new rds.ParameterGroup(this, "PostgresParams", {
      engine: dbEngine,
      parameters: {
        "rds.force_ssl": "1",
      },
    });
    const cluster = new rds.DatabaseCluster(this, "Database", {
      engine: dbEngine,
      instanceProps: {
        vpc: props.vpc,
        // The cheapest available instance type for the engine we've chosen.
        // TODO(AT-6849): Dynamically chose instance based on environment
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.LARGE),
        allowMajorVersionUpgrade: true,
        autoMinorVersionUpgrade: true,
        deleteAutomatedBackups: false,
        publiclyAccessible: false,
        vpcSubnets: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }),
      },
      backup: {
        // Time window is in UTC. This is approximately between
        // 12AM and 4AM ET (depending on Daylight Saving Time)
        preferredWindow: "06:00-07:00",
        retention: cdk.Duration.days(7),
      },
      preferredMaintenanceWindow: "Sun:07:00-Sun:08:00",
      parameterGroup: parameters,
      copyTagsToSnapshot: true,
      iamAuthentication: true,
      storageEncrypted: true,
      cloudwatchLogsExports: ["postgresql"],
    });
    this.cluster = cluster;

    // Automatic secrets rotation is not yet supported via the CDK in GovCloud even
    // though the underlying resources do exist. There is a PR open against the CDK
    // upstream in order to add this functionality:
    //    https://github.com/aws/aws-cdk/pull/17673
    // cluster.addRotationSingleUser({
    //   // Default value is 30 days, so this makes the secret much shorter-lived.
    //   // The primary means for access will be via IAM; however, we will use this
    //   // for initial bootstrapping and rare maintenance.
    //   automaticallyAfter: cdk.Duration.days(7),
    // });
    // This secret will be present since we're using the default configuration; however,
    // it will require additional workarounds (or the feature being added) to rotate
    // automatically.
    // TODO(AT-6924): Perform the implementation of automatic secrets rotation
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.adminSecret = cluster.secret!;

    const bootstrapper = new DatabaseBootstrapper(this, "DatabaseBootstrapper", {
      ...props,
      secretName: this.adminSecret.secretName,
      cluster: cluster,
    });
    this.adminSecret.grantRead(bootstrapper.backingLambda);
    cluster.connections.allowDefaultPortFrom(bootstrapper.backingLambda);

    // Ensure the DB is not created until all instances in the cluster are ready
    const instances = cluster.node.children.filter((child) => child instanceof rds.CfnDBInstance);
    const instancesReady = new cdk.ConcreteDependable();
    instances.forEach((dbInstance) => instancesReady.add(dbInstance));
    bootstrapper.bootstrapResource.node.addDependency(instancesReady);
    // If the resource does not depend on the cluster, then there may be failures during
    // stack deletion as the cluster may be deleted before the custom resource.
    bootstrapper.bootstrapResource.node.addDependency(cluster);

    // Provide a resource to determine whether the database has been created.
    this.databaseReady = new cdk.ConcreteDependable();
    this.databaseReady.add(bootstrapper.bootstrapResource);

    this.clusterResourceId = this.clusterIdGetterCustomResource();
  }

  public get clusterArn(): string {
    return cdk.Stack.of(this).formatArn({
      arnFormat: cdk.ArnFormat.COLON_RESOURCE_NAME,
      service: "rds",
      resource: "cluster",
      resourceName: this.cluster.clusterIdentifier,
    });
  }

  private clusterUserArn(user: string): string {
    return cdk.Stack.of(this).formatArn({
      arnFormat: cdk.ArnFormat.COLON_RESOURCE_NAME,
      service: "rds-db",
      resource: "dbuser",
      resourceName: `${this.clusterResourceId}/${user}`,
    });
  }

  #allowResourceToConnectAsUser(resource: ConnectableResource, user: string): void {
    this.cluster.connections.allowDefaultPortFrom(resource);
    resource.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["rds-db:connect"],
        resources: [this.clusterUserArn(user)],
      })
    );
  }

  /**
   * Grant network and IAM permissions necessary to read from the database.
   *
   * @param resource The resource to grant access to
   */
  public grantRead(resource: ConnectableResource): void {
    this.#allowResourceToConnectAsUser(resource, DatabaseUsers.READ);
  }

  /**
   * Grant network and IAM permissions necessary to write to the database.
   *
   * @param resource The resource to grant access to
   */
  public grantWrite(resource: ConnectableResource): void {
    this.#allowResourceToConnectAsUser(resource, DatabaseUsers.WRITE);
  }

  /**
   * Grant network and IAM permissions necessary to administer the database.
   *
   * @param resource The resource to grant access to
   */
  public grantAdmin(resource: ConnectableResource): void {
    this.#allowResourceToConnectAsUser(resource, DatabaseUsers.ADMIN);
  }

  /**
   * The only place this identifier seems to actually be used is in db-user
   * ARNs within an IAM policy. Unfortunately, it is not exposed as an attribute
   * in CloudFormation that we can access. Therefore, we have to make an API call
   * via a custom resource in order to expose this value.
   *
   * @returns The Cluster Resource ID of the Aurora DB Cluster
   */
  public clusterIdGetterCustomResource(): string {
    const selector = "DBClusters.0.DbClusterResourceId";
    const resource = new customResources.AwsCustomResource(this, "ClusterIdGetter", {
      onCreate: {
        service: "RDS",
        action: "describeDBClusters",
        parameters: {
          DBClusterIdentifier: this.cluster.clusterIdentifier,
        },
        physicalResourceId: customResources.PhysicalResourceId.fromResponse(selector),
      },
      policy: customResources.AwsCustomResourcePolicy.fromSdkCalls({ resources: [this.clusterArn] }),
    });
    return resource.getResponseField(selector);
  }
}
