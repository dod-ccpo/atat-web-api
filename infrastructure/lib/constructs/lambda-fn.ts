import * as ec2 from "@aws-cdk/aws-ec2";
import * as iam from "@aws-cdk/aws-iam";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import { HttpMethod } from "../http";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import { SecureBucket } from "./compliant-resources";
import * as sqs from "@aws-cdk/aws-sqs";
import { SqsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import { Database } from "./database";
import { TablePermissions, QueuePermissions, BucketPermissions } from "../resource-permissions";

/**
 * The path within the Lambda function where the RDS CA Bundle is stored.
 */
const RDS_CA_BUNDLE_NAME = "rds-gov-ca-bundle-2017.pem";

/**
 * An IAM service principal for the API Gateway service, used to grant Lambda
 * invocation permissions.
 */
const APIGW_SERVICE_PRINCIPAL = new iam.ServicePrincipal("apigateway.amazonaws.com");

export interface ApiFlexFunctionProps {
  /**
   * The HTTP method this route applies to.
   */
  readonly method?: HttpMethod;

  /**
   * The local path where the handler file is located.
   */
  readonly handlerPath?: string;

  /**
   * Any additional props to apply to the NodeJsFunction.
   *
   * Additional prop values specified here will override the defaults, including
   * the `entry` and `environment` if one is provided in this struct. Be careful.
   */
  readonly functionPropsOverride?: lambdaNodeJs.NodejsFunctionProps;

  /**
   * The VPC where resources should be created
   */
  readonly lambdaVpc?: ec2.IVpc;

  /**
   * A prop to determine if the underlying Lambda function has read permissions
   * for secrets managers.
   */
  readonly smtpSecrets?: secretsmanager.ISecret;

  /**
   * The DynamoDB table where data is stored.
   */
  readonly table?: dynamodb.ITable;

  /**
   * The RDS database to grant access to.
   */
  readonly database?: Database;

  /**
   * Optional table permissions to grant to the Lambda function.
   * One of the following may be specified: "ALL", "READ", "READ_WRITE", "WRITE".
   *
   * @default - Read/write access is given to the Lambda function if no value is specified.
   */
  readonly tablePermissions?: TablePermissions;

  /**
   * Secure bucket for S3 functions
   */
  readonly bucket?: SecureBucket;

  /**
   * Optional bucket permissions to grant to the Lambda function.
   * One of the following may be specified: "READ", "PUT", "DELETE".
   *
   * @default - Read access is given to the Lambda function if no value is specified.
   */
  readonly bucketPermissions?: BucketPermissions;

  /**
   * The SQS queue where messages are sent
   */
  readonly queue?: sqs.IQueue;

  /**
   * Optional bucket permissions to grant to the Lambda function.
   * One of the following may be specified: "SEND", "CONSUME".
   *
   * @default - Read access is given to the Lambda function if no value is specified.
   */
  readonly queuePermissions?: QueuePermissions;

  /**
   * Optional param to create an SQS event source to receive queue messages
   */
  readonly createEventSource?: boolean;

  /**
   * Optional param to change the batch size of messages received by the lambda
   * from the SQS event source
   */
  readonly batchSize?: number;

  /**
   * The State Machine that will start execution when this function
   * is called.
   */
  readonly stateMachine?: sfn.IStateMachine;
}

export class ApiFlexFunction extends cdk.Construct {
  /**
   * @param fn - the NodejsFunction, named with the @id passed to the function
   */
  public readonly fn: lambda.Function;

  constructor(scope: cdk.Construct, id: string, props: ApiFlexFunctionProps) {
    super(scope, id);
    // Create the lambda fn
    this.fn = new lambdaNodeJs.NodejsFunction(this, "PackagedFunction", {
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      ...props.functionPropsOverride,
      entry: props.handlerPath,
      vpc: props.lambdaVpc,
      bundling: {
        externalModules: ["pg-native"],
        ...props.functionPropsOverride?.bundling,
        commandHooks: {
          beforeBundling: props.functionPropsOverride?.bundling?.commandHooks?.beforeBundling ?? (() => []),
          beforeInstall: props.functionPropsOverride?.bundling?.commandHooks?.beforeInstall ?? (() => []),
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [
              ...(props.functionPropsOverride?.bundling?.commandHooks?.afterBundling(inputDir, outputDir) ?? []),
              `curl -sL -o ${outputDir}/${RDS_CA_BUNDLE_NAME} https://truststore.pki.us-gov-west-1.rds.amazonaws.com/global/global-bundle.pem`,
            ];
          },
        },
      },
    });
    this.fn.addEnvironment("ATAT_RDS_CA_BUNDLE_NAME", RDS_CA_BUNDLE_NAME);

    // Optional - create API Gateway connection and grant permissions
    if (props.method) {
      this.fn.addPermission("AllowApiGatewayInvoke", {
        principal: APIGW_SERVICE_PRINCIPAL,
        sourceAccount: cdk.Aws.ACCOUNT_ID,
      });
      // editing name from API spec
      (this.fn.node.defaultChild as lambda.CfnFunction).overrideLogicalId(id + "Function");
    }

    // Optional - Grant access to the database and set environment variables
    if (props.database && props.tablePermissions) {
      this.grantDatabasePermissions(props.database, props.tablePermissions);
      this.fn
        .addEnvironment("ATAT_DATABASE_NAME", props.database.databaseName)
        .addEnvironment("ATAT_DATABASE_WRITE_HOST", props.database.cluster.clusterEndpoint.hostname)
        .addEnvironment("ATAT_DATABASE_READ_HOST", props.database.cluster.clusterReadEndpoint.hostname)
        .addEnvironment("ATAT_DATABASE_PORT", cdk.Stack.of(this).resolve(props.database.cluster.clusterEndpoint.port));
    }

    // Optional - create DynamoDB connection and grant permissions
    if (props.table && props.tablePermissions) {
      this.fn.addEnvironment("ATAT_TABLE_NAME", props.table.tableName);
      this.grantTablePermissions(props.table, props.tablePermissions);
    }

    // Optional - grant permissions for secrets manager
    if (props.smtpSecrets) {
      props.smtpSecrets.grantRead(this.fn);
    }

    // Optional - create S3 bucket connection and grant permissions
    if (props.bucket && props.bucketPermissions) {
      this.fn.addEnvironment("DATA_BUCKET", props.bucket.bucket.bucketName);
      this.grantBucketPermissions(props.bucket.bucket, props.bucketPermissions);
    }

    // Optional - create SQS connection and grant permissions
    if (props.queue && props.queuePermissions) {
      this.fn.addEnvironment("ATAT_QUEUE_URL", props.queue.queueUrl);
      this.grantSQSPermissions(props.queue, props.queuePermissions);
      // allows the fn to subscribe to the queue using an EventSource
      if (props.createEventSource) {
        this.fn.addEventSource(new SqsEventSource(props.queue, props.batchSize ? { batchSize: props.batchSize } : {}));
      }
    }

    // Optional - create State Machine and grant permissions
    if (props.stateMachine) {
      this.fn.addEnvironment("SFN_ARN", props.stateMachine.stateMachineArn);
      props.stateMachine.grantStartExecution(this.fn);
    }
  }

  private grantDatabasePermissions(database: Database, tablePermissions: TablePermissions): void {
    // These grants happen in order so that the proper sets of permissions are all granted and
    // so that database user environment variable ends up being set to the most privileged user
    // that the function should have access to assume.
    if (tablePermissions & TablePermissions.READ) {
      database.grantRead(this.fn);
      this.fn.addEnvironment("ATAT_DATABASE_USER", "atat_api_read");
    }
    if (tablePermissions & TablePermissions.WRITE) {
      database.grantWrite(this.fn);
      this.fn.addEnvironment("ATAT_DATABASE_USER", "atat_api_write");
    }
    if (tablePermissions & TablePermissions.ADMINISTER) {
      database.grantAdmin(this.fn);
      this.fn.addEnvironment("ATAT_DATABASE_USER", "atat_api_admin");
    }
  }

  private grantTablePermissions(table: dynamodb.ITable, tablePermissions: TablePermissions): void {
    if (tablePermissions & TablePermissions.READ) {
      table.grantReadData(this.fn);
    }
    if (tablePermissions & TablePermissions.WRITE) {
      table.grantWriteData(this.fn);
    }
    if (tablePermissions & TablePermissions.ADMINISTER) {
      table.grantFullAccess(this.fn);
    }
  }

  private grantBucketPermissions(bucket: s3.IBucket, bucketPermissions: string | undefined): iam.Grant | undefined {
    switch (bucketPermissions) {
      case "READ":
        return bucket.grantRead(this.fn);
      case "PUT":
        return bucket.grantPut(this.fn);
      case "DELETE":
        return bucket.grantDelete(this.fn);
      default:
        cdk.Annotations.of(this).addError("Unknown BucketPermissions requested: " + bucketPermissions);
        return undefined;
    }
  }

  private grantSQSPermissions(queue: sqs.IQueue, queuePermissions: string | undefined): iam.Grant | undefined {
    switch (queuePermissions) {
      case "SEND":
        return queue.grantSendMessages(this.fn);
      case "CONSUME":
        return queue.grantConsumeMessages(this.fn);
      default:
        cdk.Annotations.of(this).addError("Unknown BucketPermissions requested: " + queuePermissions);
        return undefined;
    }
  }
}
