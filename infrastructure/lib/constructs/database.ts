import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as customResources from "@aws-cdk/custom-resources";
import * as rds from "@aws-cdk/aws-rds";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";

import { packageRoot } from "../util";

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
      environment: {
        DATABASE_SECRET_NAME: props.secretName,
        DATABASE_HOST: props.cluster.clusterEndpoint.hostname,
      },
      memorySize: 1024,
      timeout: cdk.Duration.minutes(5),
      bundling: {
        // forceDockerBundling: true,
        externalModules: ["pg-native"],
      },
    });
    this.bootstrapResource = new cdk.CustomResource(this, "CustomResource", {
      serviceToken: handler.functionArn,
      properties: {
        DatabaseName: props.databaseName,
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
  public readonly cluster: rds.IDatabaseCluster;
  public readonly adminSecret: secretsmanager.ISecret;

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
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE),
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
  }
}
