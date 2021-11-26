import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as rds from "@aws-cdk/aws-rds";
import * as iam from "@aws-cdk/aws-iam";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";

import { packageRoot } from "../util";
import { CfnDBInstance } from "@aws-cdk/aws-rds";
import { ConcreteDependable } from "@aws-cdk/core";

export interface DatabaseProps {
  vpc: ec2.IVpc;
  databaseName?: string;
}

interface BootstrapProps extends DatabaseProps {
  secretName: string;
  cluster: rds.IDatabaseCluster;
}

class DatabaseBootstrapper extends cdk.Construct {
  public readonly bootstrapResource: cdk.CustomResource;
  public readonly backingLambda: lambda.IFunction;
  constructor(scope: cdk.Construct, id: string, props: BootstrapProps) {
    super(scope, id);
    const handler = new lambdaNodeJs.NodejsFunction(this, "Function", {
      vpc: props.vpc,
      entry: packageRoot() + "/rds/initial-bootstrap.ts",
      memorySize: 1024,
      timeout: cdk.Duration.minutes(5),
      bundling: {
        // forceDockerBundling: true,
        externalModules: ["pg-native"],
        commandHooks: {
          beforeBundling() {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [
              `curl -sL -o /tmp/rds-ca-2017.pem https://truststore.pki.us-gov-west-1.rds.amazonaws.com/global/global-bundle.pem`,
              `cp /tmp/rds-ca-2017.pem ${outputDir}/rds-ca-2017.pem`,
            ];
          },
          beforeInstall() {
            return [];
          },
        },
      },
    });
    this.bootstrapResource = new cdk.CustomResource(this, "CustomResource", {
      serviceToken: handler.functionArn,
      properties: {
        DatabaseName: props.databaseName,
        DatabaseHost: props.cluster.clusterEndpoint.hostname,
        DatabaseSecretName: props.secretName,
      },
    });
    this.backingLambda = handler;
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

  constructor(scope: cdk.Construct, id: string, props: DatabaseProps) {
    super(scope, id);
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
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.LARGE),
        allowMajorVersionUpgrade: true,
        autoMinorVersionUpgrade: true,
        deleteAutomatedBackups: false,
        // Performance Insights are not available in AWS GovCloud (US)
        // enablePerformanceInsights: true,
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

    // cluster.addRotationSingleUser({
    //   // Default value is 30 days, so this makes the secret much shorter-lived.
    //   // The primary means for access will be via IAM; however, we will use this
    //   // for initial bootstrapping and rare maintenance.
    //   automaticallyAfter: cdk.Duration.days(7),
    // });
    // We bound the secret itself as a rotating secret so we can be sure that there
    // is in fact a secret for the cluster.
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
    const instances = cluster.node.children.filter((child) => child instanceof CfnDBInstance);
    const instancesReady = new ConcreteDependable();
    instances.forEach((dbInstance) => instancesReady.add(dbInstance));
    bootstrapper.bootstrapResource.node.addDependency(instancesReady);

    // Provide a resource to determine whether the database has been created.
    this.databaseReady = new ConcreteDependable();
    this.databaseReady.add(bootstrapper.bootstrapResource);
  }

  private clusterUserArn(user: string): string {
    return cdk.Stack.of(this).formatArn({
      arnFormat: cdk.ArnFormat.COLON_RESOURCE_NAME,
      service: "rds-db",
      resource: "dbuser",
      resourceName: `${this.cluster.clusterIdentifier}/${user}`,
    });
  }

  /**
   * Grant network and IAM permissions necessary to read from the database.
   *
   * @param resource The resource to grant access to
   */
  public grantRead(resource: ec2.IConnectable & iam.IGrantable): void {
    this.cluster.connections.allowDefaultPortFrom(resource);
    resource.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["rds-db:connect"],
        resources: [this.clusterUserArn("atat_api_read")],
      })
    );
  }

  /**
   * Grant network and IAM permissions necessary to write to the database.
   *
   * @param resource The resource to grant access to
   */
  public grantWrite(resource: ec2.IConnectable & iam.IGrantable): void {
    this.cluster.connections.allowDefaultPortFrom(resource);
    resource.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["rds-db:connect"],
        resources: [this.clusterUserArn("atat_api_write")],
      })
    );
  }

  /**
   * Grant network and IAM permissions necessary to administer the database.
   *
   * @param resource The resource to grant access to
   */
  public grantAdmin(resource: ec2.IConnectable & iam.IGrantable): void {
    this.cluster.connections.allowDefaultPortFrom(resource);
    resource.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["rds-db:connect"],
        resources: [this.clusterUserArn("atat_api_admin")],
      })
    );
  }
}
