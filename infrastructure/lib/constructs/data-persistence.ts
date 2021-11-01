import { SecureTable, SecureTableProps } from "./compliant-resources";

import * as cdk from "@aws-cdk/core";
import * as opensearch from "@aws-cdk/aws-opensearchservice";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as eventSource from "@aws-cdk/aws-lambda-event-sources";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as sqs from "@aws-cdk/aws-sqs";

export interface DataPersistenceProps {
  tableProps: SecureTableProps;
  vpc: ec2.IVpc;
  handlerFile: string;
}

export class DataPersistence extends cdk.Construct {
  public readonly table: SecureTable;
  public readonly opensearchDomain: opensearch.Domain;
  public readonly dlq: sqs.IQueue;

  constructor(scope: cdk.Construct, id: string, props: DataPersistenceProps) {
    super(scope, id);
    this.table = new SecureTable(this, "Table", {
      tableProps: { ...props.tableProps.tableProps, stream: dynamodb.StreamViewType.NEW_IMAGE },
    });
    this.opensearchDomain = new opensearch.Domain(this, "Domain", {
      version: opensearch.EngineVersion.OPENSEARCH_1_0,
      enableVersionUpgrade: true,
      vpc: props.vpc,
      nodeToNodeEncryption: true,
      enforceHttps: true,
      encryptionAtRest: {
        enabled: true,
      },
      zoneAwareness: {
        enabled: true,
      },
      capacity: {
        dataNodes: 2,
      },
      logging: {
        appLogEnabled: true,
        slowIndexLogEnabled: true,
        slowSearchLogEnabled: true,
        // auditLogEnabled: true,
      },
      tlsSecurityPolicy: opensearch.TLSSecurityPolicy.TLS_1_2,
      vpcSubnets: [props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED })],
    });

    this.dlq = new sqs.Queue(this, "OpenSearchDql");
    const streamHandlerFunction = new lambdaNodeJs.NodejsFunction(this, "StreamHandler", {
      entry: props.handlerFile,
      vpc: props.vpc,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        OPENSEARCH_DOMAIN: this.opensearchDomain.domainEndpoint,
      },
    });
    streamHandlerFunction.addEventSource(
      new eventSource.DynamoEventSource(this.table.table, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        reportBatchItemFailures: true,
        onFailure: new eventSource.SqsDlq(this.dlq),
        retryAttempts: 10,
        enabled: true,
      })
    );
    this.opensearchDomain.grantReadWrite(streamHandlerFunction);
    this.opensearchDomain.connections.allowFrom(streamHandlerFunction, ec2.Port.tcp(443));
  }
}
