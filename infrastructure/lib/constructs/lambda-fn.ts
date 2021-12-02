import {
  Duration,
  Stack,
  aws_dynamodb as dynamodb,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodeJs,
  aws_lambda_event_sources as lambdaEventSources,
  aws_s3 as s3,
  aws_secretsmanager as secretsmanager,
  aws_stepfunctions as sfn,
  aws_sqs as sqs,
} from "aws-cdk-lib";

import { Construct } from "constructs";

import { HttpMethod } from "../http";
import { SecureBucket } from "./compliant-resources";
import { Database } from "./database";
import { TablePermissions } from "../table-permissions";

/**
 * The path within the Lambda function where the RDS CA Bundle is stored.
 */
const RDS_CA_BUNDLE_NAME = "rds-gov-ca-bundle-2017.pem";

/**
 * An IAM service principal for the API Gateway service, used to grant Lambda
 * invocation permissions.
 */
const APIGW_SERVICE_PRINCIPAL = new iam.ServicePrincipal("apigateway.amazonaws.com");

export interface ApiFunctionPropstest {
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
  readonly bucketPermissions?: string;

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
  readonly queuePermissions?: string;

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

export class ApiFlexFunction extends Construct {
  /**
   * Required resources
   * @param fn - the NodejsFunction, named with the @id passed to the function
   */
  public readonly fn: lambda.Function;
  /**
   * Optional resources to add to function:
   * @param method - HTTP Method, indicates that the function uses API Gateway
   * @param table - DynamoDB table connection
   * @param bucket - S3 bucket connection
   * @param queue - SQS queue connection
   * @param stateMachine - State Machine connection
   */
  public readonly method: HttpMethod;
  public readonly table: dynamodb.ITable;
  public readonly bucket: s3.IBucket;
  public readonly queue: sqs.IQueue;
  public readonly stateMachine: sfn.IStateMachine;

  constructor(scope: Construct, id: string, props: ApiFunctionPropstest) {
    super(scope, id);
    // Create the lambda fn
    this.fn = new lambdaNodeJs.NodejsFunction(this, "PackagedFunction", {
      entry: props.handlerPath,
      vpc: props.lambdaVpc,
      memorySize: 256,
      timeout: Duration.seconds(5),
      ...props.functionPropsOverride,
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
              `cp /tmp/rds-ca-2017.pem ${outputDir}/${RDS_CA_BUNDLE_NAME}`,
            ];
          },
          beforeInstall() {
            return [];
          },
        },
      },
    });
    this.fn.addEnvironment("ATAT_RDS_CA_BUNDLE_NAME", RDS_CA_BUNDLE_NAME);

    // Optional - create API Gateway connection and grant permissions
    if (props.method) {
      this.fn.addPermission("AllowApiGatewayInvoke", { principal: APIGW_SERVICE_PRINCIPAL });
      // editing name from API spec
      (this.fn.node.defaultChild as lambda.CfnFunction).overrideLogicalId(id + "Function");
    }

    if (props.database && props.tablePermissions) {
      switch (props.tablePermissions) {
        case TablePermissions.READ:
          props.database.grantRead(this.fn);
          this.fn.addEnvironment("ATAT_DATABASE_USER", "atat_api_read");
          break;
        default:
          props.database.grantWrite(this.fn);
          this.fn.addEnvironment("ATAT_DATABASE_USER", "atat_api_write");
          break;
      }
      // Note: Always pass the cluster endpoints, never endpoints for a particular instance. The roles of an
      // instance can change over time.
      this.fn.addEnvironment("ATAT_DATABASE_WRITE_HOST", props.database.cluster.clusterEndpoint.hostname);
      this.fn.addEnvironment("ATAT_DATABASE_READ_HOST", props.database.cluster.clusterReadEndpoint.hostname);
      // This value must be resolved to a string token, otherwise it remains as a stringified integer token,
      // which does not get replaced. This results in the Lambda function attempting to connect to the database
      // on a totally invalid port, such as `-1`.
      this.fn.addEnvironment("ATAT_DATABASE_PORT", Stack.of(this).resolve(props.database.cluster.clusterEndpoint.port));
      this.fn.addEnvironment("ATAT_DATABASE_NAME", props.database.databaseName);
    }

    // Optional - create DynamoDB connection and grant permissions
    if (props.table && props.tablePermissions) {
      this.table = props.table;
      this.fn.addEnvironment("ATAT_TABLE_NAME", props.table.tableName);
      this.grantTablePermissions(props.tablePermissions);
    }

    // Optional - grant permissions for secrets manager
    if (props.smtpSecrets) {
      props.smtpSecrets.grantRead(this.fn);
    }

    // Optional - create S3 bucket connection and grant permissions
    if (props.bucket && props.bucketPermissions) {
      this.bucket = props.bucket.bucket;
      this.fn.addEnvironment("DATA_BUCKET", this.bucket.bucketName);
      this.grantBucketPermissions(props.bucketPermissions);
    }

    // Optional - create SQS connection and grant permissions
    if (props.queue && props.queuePermissions) {
      this.queue = props.queue;
      this.fn.addEnvironment("ATAT_QUEUE_URL", props.queue.queueUrl);
      this.grantSQSPermissions(props.queuePermissions);
      // allows the fn to subscribe to the queue using an EventSource
      if (props.createEventSource) {
        this.fn.addEventSource(
          new lambdaEventSources.SqsEventSource(this.queue, props.batchSize ? { batchSize: props.batchSize } : {})
        );
      }
    }

    // Optional - create State Machine and grant permissions
    if (props.stateMachine) {
      this.stateMachine = props.stateMachine;
      this.fn.addEnvironment("SFN_ARN", props.stateMachine.stateMachineArn);
      this.stateMachine.grantStartExecution(this.fn);
    }
  }

  private grantTablePermissions(tablePermissions: string | undefined): iam.Grant | undefined {
    switch (tablePermissions) {
      case "ALL":
        return this.table.grantFullAccess(this.fn);
      case "READ":
        return this.table.grantReadData(this.fn);
      case "READ_WRITE":
        return this.table.grantReadWriteData(this.fn);
      case "WRITE":
        return this.table.grantWriteData(this.fn);
      default:
        return this.table.grantReadWriteData(this.fn);
    }
  }

  private grantBucketPermissions(bucketPermissions: string | undefined): iam.Grant | undefined {
    switch (bucketPermissions) {
      case "READ":
        return this.bucket.grantRead(this.fn);
      case "PUT":
        return this.bucket.grantPut(this.fn);
      case "DELETE":
        return this.bucket.grantDelete(this.fn);
      default:
        return this.bucket.grantRead(this.fn);
    }
  }

  private grantSQSPermissions(queuePermissions: string | undefined): iam.Grant | undefined {
    switch (queuePermissions) {
      case "SEND":
        return this.queue.grantSendMessages(this.fn);
      case "CONSUME":
        return this.queue.grantConsumeMessages(this.fn);
      default:
        return this.queue.grantSendMessages(this.fn);
    }
  }
}
