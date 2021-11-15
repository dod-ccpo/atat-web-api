import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as rds from "@aws-cdk/aws-rds";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";

export interface DatabaseProps {
  vpc: ec2.IVpc;
}

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
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE),
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
        preferredWindow: "06:00-08:00",
        retention: cdk.Duration.days(7),
      },
      preferredMaintenanceWindow: "Sun:06:00-Sun:08:00",
      parameterGroup: parameters,
      copyTagsToSnapshot: true,
      iamAuthentication: true,
      storageEncrypted: true,
      cloudwatchLogsExports: ["postgresql"],
    });
    this.cluster = cluster;
    cluster.addRotationSingleUser({
      // Default value is 30 days, so this makes the secret much shorter-lived.
      // The primary means for access will be via IAM; however, we will use this
      // for initial bootstrapping and rare maintenance.
      automaticallyAfter: cdk.Duration.days(7),
    });
    this.adminSecret = cluster.secret!;
  }
}
