import * as s3 from "@aws-cdk/aws-s3";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as cdk from "@aws-cdk/core";

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

export interface SecureAPIGatewayProps {
  /**
   * The properties to configure the API Gateway
   */
  apiGatewayProps: apigw.SpecRestApiProps;
}

/**
 * Creates a secure API Gateway with properties enabled for compliance
 *  - cache enabled and encrypted by default
 *  - execution logs enabled by default
 */
export class SecureAPIGateway extends cdk.Construct {
  readonly apiGateway: apigw.SpecRestApi;
  constructor(scope: cdk.Construct, id: string, props: SecureAPIGatewayProps) {
    super(scope, id);

    const apiGateway = new apigw.SpecRestApi(this, id, {
      ...props.apiGatewayProps,
      deployOptions: {
        // sensible defaults allowed to be overridden
        cacheTtl: cdk.Duration.minutes(60), // ! override for dev purposes?
        // passed in API Gateway configurations
        ...props.apiGatewayProps?.deployOptions,
        // secure defaults that cannot be overridden
        cachingEnabled: true,
        cacheDataEncrypted: true,
        loggingLevel: apigw.MethodLoggingLevel.INFO, // execution logging
      },
    });

    this.apiGateway = apiGateway;
  }
}
