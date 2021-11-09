import * as s3 from "@aws-cdk/aws-s3";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as cdk from "@aws-cdk/core";
import * as sqs from "@aws-cdk/aws-sqs";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as logs from "@aws-cdk/aws-logs";

export interface SecureBucketProps {
  logTargetBucket: s3.IBucket | "self";
  logTargetPrefix: string;
  bucketProps?: s3.BucketProps;
}

/**
 * Creates a secure bucket with enabled server access logs.
 */
export class SecureBucket extends cdk.Construct {
  public readonly bucket: s3.IBucket;

  constructor(scope: cdk.Construct, id: string, props: SecureBucketProps) {
    super(scope, id);

    const bucket = new s3.Bucket(this, id, {
      // sensible defaults allowed to be overridden
      accessControl: props.logTargetBucket === "self" ? s3.BucketAccessControl.LOG_DELIVERY_WRITE : undefined,
      // passed in configuration options
      ...props.bucketProps,
      // secure defaults that cannot be overridden
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // TODO: Prevent auto-delete when we properly handle differences between dev and
      // higher environments
      // autoDeleteObjects: false,
      serverAccessLogsBucket: props.logTargetBucket === "self" ? undefined : props.logTargetBucket,
      serverAccessLogsPrefix: props.logTargetPrefix,
    });
    this.bucket = bucket;
  }
}

export interface SecureTableProps {
  /**
   * The properties to configure the DynamoDB table
   */
  tableProps: dynamodb.TableProps;
}
/**
 * Creates a secure DynamoDB table with properties enabled for compliance
 *  - point-in-time recover (PITR) enabled by default
 */
export class SecureTable extends cdk.Construct {
  /**
   * The created DynamoDB table
   */
  public readonly table: dynamodb.ITable;

  constructor(scope: cdk.Construct, id: string, props: SecureTableProps) {
    super(scope, id);

    const table = new dynamodb.Table(this, id, {
      // passed in table configuration
      ...props.tableProps,
      // secure defaults that cannot be overridden
      pointInTimeRecovery: true,
    });

    this.table = table;
  }
}

export interface SecureRestApiProps extends apigw.RestApiBaseProps {
  /**
   * The properties to configure the API Gateway
   */
  apiDefinition?: apigw.ApiDefinition;
}

/**
 * Creates a secure API Gateway with properties enabled for compliance
 *  - cache enabled and encrypted by default
 *  - execution logs enabled by default
 */
export class SecureRestApi extends cdk.Construct {
  readonly restApi: apigw.RestApiBase;

  constructor(scope: cdk.Construct, id: string, props: SecureRestApiProps) {
    super(scope, id);
    const baseProps = {
      // This is slightly repetitive between endpointTypes and parameters.endpointConfigurationTypes; however, due
      // to underlying CloudFormation behaviors, endpointTypes is not evaluated entirely correctly when a
      // parameter specification is given. Specifying both ensures that we truly have a regional endpoint rather than
      // edge.
      endpointTypes: [apigw.EndpointType.REGIONAL],
      parameters: {
        endpointConfigurationTypes: apigw.EndpointType.REGIONAL,
      },
      deployOptions: {
        // passed in API Gateway configurations
        ...props?.deployOptions,
        // secure defaults that cannot be overridden
        cachingEnabled: true,
        cacheDataEncrypted: true,
        cacheTtl: cdk.Duration.minutes(0),
        loggingLevel: apigw.MethodLoggingLevel.INFO, // execution logging
      },
    };

    // TODO: refactor to use a function (e.g. determineApiClass) that returns constructor
    // reference allowing for further prop validation (and mutual exclusion of props)
    let restApi: apigw.RestApiBase;
    if (props.apiDefinition) {
      restApi = new apigw.SpecRestApi(this, id, { apiDefinition: props.apiDefinition, ...baseProps });
    } else {
      restApi = new apigw.RestApi(this, id, baseProps);
    }

    this.restApi = restApi;
  }
}
export interface SecureQueueProps {
  /**
   * The properties to configure the Queue
   */
  queueProps: sqs.QueueProps;
}
/**
 * Creates a secure(?) SQS Queue with properties enabled for compliance
 *  - TODO
 */
export class SecureQueue extends cdk.Construct {
  /**
   * The created SQS Queue
   */
  public readonly queue: sqs.IQueue;

  constructor(scope: cdk.Construct, id: string, props: SecureQueueProps) {
    super(scope, id);

    const queue = new sqs.Queue(this, id, {
      ...props.queueProps,
    });

    this.queue = queue;
  }
}

interface SecureStateMachineProps {
  /**
   * Props to define a State Machine
   */
  readonly stateMachineProps: sfn.StateMachineProps;
  /**
   * Props to define the State Machine log group
   */
  readonly logGroup: logs.ILogGroup;
}

/**
 * Creates a Secure State Machine in AWS Step Functions service
 * - uses a Standard State Machine Type (default)
 * - 130 seconds timeout (default)
 *
 * TODO(?): add secure features for creating a secure State Machine once
 * it is known what requirements are needed to be considered being secure.
 */
export class SecureStateMachine extends cdk.Construct {
  readonly stateMachine: sfn.IStateMachine;
  constructor(scope: cdk.Construct, id: string, props: SecureStateMachineProps) {
    super(scope, id);
    const stateMachine = new sfn.StateMachine(this, id, {
      // defaults that can be overridden
      timeout: cdk.Duration.seconds(130),
      stateMachineType: sfn.StateMachineType.STANDARD,
      // configuration passed in
      ...props.stateMachineProps,
      // defaults that cannot be overridden
      tracingEnabled: true,
      logs: {
        level: sfn.LogLevel.ALL,
        destination: props.logGroup,
      },
    });
    this.stateMachine = stateMachine;
  }
}
