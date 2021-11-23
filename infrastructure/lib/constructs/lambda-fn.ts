import * as apigw from "@aws-cdk/aws-apigateway";
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
/**
 * An IAM service principal for the API Gateway service, used to grant Lambda
 * invocation permissions.
 */
const APIGW_SERVICE_PRINCIPAL = new iam.ServicePrincipal("apigateway.amazonaws.com");

export interface ApiFunctionProps {
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
   * Optional table permissions to grant to the Lambda function.
   * One of the following may be specified: "ALL", "READ", "READ_WRITE", "WRITE".
   *
   * @default - Read/write access is given to the Lambda function if no value is specified.
   */
  readonly tablePermissions?: string;

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

export abstract class ApiFunction extends cdk.Construct {
  /**
   * The underlying Lambda function for the API call.
   */
  public readonly fn: lambda.Function;

  /**
   * The HTTP method that a route should be created for.
   */
  // public readonly method?: HttpMethod;

  /**
   * The API gateway Method resource that gets created.
   */
  public readonly route: apigw.Method;
  /**
   * The DynamoDB table.
   */
  public readonly table?: dynamodb.ITable;
  public readonly bucket?: s3.IBucket;
  readonly queue?: sqs.IQueue;
  /**
   * A function with the permissions to start execution of a State Machine
   */
  readonly stateMachine?: sfn.IStateMachine;

  protected constructor(scope: cdk.Construct, id: string, props: ApiFunctionProps) {
    super(scope, id);
    // this.method = props.method;

    // Create the lambda fn
    this.fn = new lambdaNodeJs.NodejsFunction(this, "PackagedFunction", {
      entry: props.handlerPath,
      vpc: props.lambdaVpc,
      ...props.functionPropsOverride,
    });
    // Optional - create table
    if (props.table) {
      this.table = props.table;
      this.fn.addEnvironment("ATAT_TABLE_NAME", props.table.tableName);
      // assign permissions
      switch (props.tablePermissions) {
        case "ALL":
          this.table.grantFullAccess(this.fn);
          break;
        case "READ":
          this.table.grantReadData(this.fn);
          break;
        case "READ_WRITE":
          this.table.grantReadWriteData(this.fn);
          break;
        case "WRITE":
          this.table.grantWriteData(this.fn);
          break;
        default:
          this.table.grantReadWriteData(this.fn);
      }
    }
    // if it is using API Gateway it needs a principal
    this.fn.addPermission("AllowApiGatewayInvoke", { principal: APIGW_SERVICE_PRINCIPAL });
    // editing name from API spec
    (this.fn.node.defaultChild as lambda.CfnFunction).overrideLogicalId(id + "Function");

    // Optional - secrets manager
    if (props.smtpSecrets) {
      props.smtpSecrets.grantRead(this.fn);
    }
    // Optional - s3 bucket
    if (props.bucket) {
      this.bucket = props.bucket.bucket;
      this.fn.addEnvironment("DATA_BUCKET", this.bucket.bucketName);
      switch (props.bucketPermissions) {
        case "READ":
          this.bucket.grantRead(this.fn);
          break;
        case "PUT":
          this.bucket.grantPut(this.fn);
          break;
        case "DELETE":
          this.bucket.grantDelete(this.fn);
          break;
        default:
          this.bucket.grantRead(this.fn);
      }
    }
    // Optional - SQS
    if (props.queue) {
      this.queue = props.queue;
      this.fn.addEnvironment("ATAT_QUEUE_URL", props.queue.queueUrl);
      switch (props.queuePermissions) {
        case "SEND":
          this.queue.grantSendMessages(this.fn);
          break;
        case "CONSUME":
          this.queue.grantConsumeMessages(this.fn);
      }
      // allows the fn to subscribe to the queue using an EventSource
      if (props.createEventSource) {
        this.fn.addEventSource(new SqsEventSource(this.queue, props.batchSize ? { batchSize: props.batchSize } : {}));
      }
    }
    // Optional - State Machine
    if (props.stateMachine) {
      this.stateMachine = props.stateMachine;
      this.fn.addEnvironment("SFN_ARN", props.stateMachine.stateMachineArn);
      this.stateMachine.grantStartExecution(this.fn);
    }
  }
}
