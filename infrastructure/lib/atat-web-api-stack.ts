import * as apigw from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as s3asset from "@aws-cdk/aws-s3-assets";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ssm from "@aws-cdk/aws-ssm";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sqs from "@aws-cdk/aws-sqs";
import { ApiDynamoDBFunction } from "./constructs/api-dynamodb-function";
import { ApiS3Function } from "./constructs/api-s3-function";
import { ApiSQSFunction } from "./constructs/api-sqs-function";
import { ApiSQSDynamoDBFunction } from "./constructs/api-sqs-dynamodb-function";
import { CognitoAuthentication } from "./constructs/authentication";
import { SecureBucket, SecureQueue, SecureRestApi, SecureTable } from "./constructs/compliant-resources";
import { TaskOrderLifecycle } from "./constructs/task-order-lifecycle";
import { HttpMethod } from "./http";
import * as utils from "./util";
import { convertSchema } from "./load-schema";
interface AtatIdpProps {
  secretName: string;
  providerName: string;
  adminsGroupName?: string;
  usersGroupName?: string;
}

interface AtatSmtpProps {
  secretName: string;
}

export interface AtatWebApiStackProps extends cdk.StackProps {
  environmentId: string;
  idpProps: AtatIdpProps;
  removalPolicy?: cdk.RemovalPolicy;
  requireAuthorization?: boolean;
  smtpProps: AtatSmtpProps;
  vpc: ec2.IVpc;
}

export class AtatWebApiStack extends cdk.Stack {
  private readonly environmentId: string;
  public readonly restApi: apigw.IRestApi;
  public readonly submitQueue: sqs.IQueue;
  public readonly emailQueue: sqs.IQueue;
  public readonly emailDeadLetterQueue: sqs.IQueue;
  public readonly table: dynamodb.ITable;
  public readonly functions: lambda.IFunction[] = [];
  public readonly ssmParams: ssm.IParameter[] = [];
  public readonly outputs: cdk.CfnOutput[] = [];

  constructor(scope: cdk.Construct, id: string, props: AtatWebApiStackProps) {
    super(scope, id, props);

    this.templateOptions.description = "Resources to support the ATAT application API";
    this.environmentId = props.environmentId;

    this.setupCognito(props.idpProps, props.removalPolicy);

    // Create a shared DynamoDB table that will be used by all the functions in the project.
    this.table = new SecureTable(this, "AtatTable", {
      tableProps: {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: props?.removalPolicy,
      },
    }).table;
    this.outputs.push(
      new cdk.CfnOutput(this, "TableName", {
        value: this.table.tableName,
      })
    );

    // Create a queue for PortfolioDraft submission
    this.submitQueue = new SecureQueue(this, "SubmitQueue", { queueProps: {} }).queue;
    this.outputs.push(
      new cdk.CfnOutput(this, "SubmitQueueName", {
        value: this.submitQueue.queueName,
      })
    );

    // Create two queues for sending emails
    this.emailDeadLetterQueue = new SecureQueue(this, "EmailDLQ", {
      queueProps: {
        visibilityTimeout: cdk.Duration.seconds(30),
      },
    }).queue;
    this.emailQueue = new SecureQueue(this, "EmailQueue", {
      queueProps: {
        visibilityTimeout: cdk.Duration.seconds(30),
        deadLetterQueue: { queue: this.emailDeadLetterQueue, maxReceiveCount: 1 },
      },
    }).queue;
    this.outputs.push(
      new cdk.CfnOutput(this, "EmailQueueName", {
        value: this.emailQueue.queueName,
      }),
      new cdk.CfnOutput(this, "EmailDLQName", {
        value: this.emailDeadLetterQueue.queueName,
      })
    );

    const forceAuth = new cdk.CfnCondition(this, "ForceAuthorization", {
      expression: cdk.Fn.conditionEquals(props?.requireAuthorization ?? true, true),
    });
    forceAuth.overrideLogicalId("IsAuthorizationRequired");
    this.outputs.push(
      new cdk.CfnOutput(this, "AuthenticationRequired", {
        value: this.resolve(cdk.Fn.conditionIf(forceAuth.logicalId, "true", "false")),
      })
    );

    // Convert the YAML API spec to JSON, send the JSON schema to packages/api/models
    convertSchema();

    // PortfolioDraft Operations
    this.addDatabaseApiFunction("getPortfolioDrafts", "portfolioDrafts/", props.vpc);
    this.addDatabaseApiFunction("getPortfolioDraft", "portfolioDrafts/", props.vpc);
    this.addDatabaseApiFunction("createPortfolioDraft", "portfolioDrafts/", props.vpc);
    this.addDatabaseApiFunction("deletePortfolioDraft", "portfolioDrafts/", props.vpc);
    // NotImplemented is the "default" method for unimplemented operations
    this.addDatabaseApiFunction("notImplemented", "portfolioDrafts/", props.vpc);

    // PortfolioStep Operations (all files in the portfolio/ folder)
    this.addDatabaseApiFunction("getPortfolioStep", "portfolioDrafts/portfolio/", props.vpc);
    this.addDatabaseApiFunction("createPortfolioStep", "portfolioDrafts/portfolio/", props.vpc);

    // FundingStep Operations (all files live in the funding/ folder)
    this.addDatabaseApiFunction("getFundingStep", "portfolioDrafts/funding/", props.vpc);
    this.addDatabaseApiFunction("createFundingStep", "portfolioDrafts/funding/", props.vpc);

    // ApplicationStep Operations (all files live in the application/ folder)
    this.addDatabaseApiFunction("getApplicationStep", "portfolioDrafts/application/", props.vpc);
    this.addDatabaseApiFunction("createApplicationStep", "portfolioDrafts/application/", props.vpc);

    // Submission operations (all files live in the submit/ folder)
    this.addQueueDatabaseApiFunction("submitPortfolioDraft", "portfolioDrafts/submit/", props.vpc);

    // Functions that are triggered by events in the submit queue
    // These, for now, can be treated just like regular API functions because they look
    // and act like them in nearly every way except being accessible via API Gateway.
    // This may require more significant refactoring as the design for these functions
    // is further fleshed out.
    this.addQueueDatabaseApiFunction("subscribePortfolioDraftSubmission", "portfolioDrafts/submit/", props.vpc);

    // The API spec, which just so happens to be a valid CloudFormation snippet (with some actual CloudFormation
    // in it) gets uploaded to S3. The Asset resource reuses the same bucket that the CDK does, so this does not
    // require any additional buckets to be created.
    const apiAsset = new s3asset.Asset(this, "ApiSpecAsset", {
      path: utils.packageRoot() + "../../atat_provisioning_wizard_api.yaml",
    });

    // And now we include that snippet as an actual part of the template using the AWS::Include Transform. Since
    // snippet is valid CloudFormation with real Fn::Sub invocations, those will be interpreted. This results in
    // all of the function ARNs being inserted into the x-aws-apigateway-integration resources when the template
    // is evaluated.
    const apiSpecAsTemplateInclude = cdk.Fn.transform("AWS::Include", { Location: apiAsset.s3ObjectUrl });

    // And with the data now loaded from the template, we can use ApiDefinition.fromInline to parse it as real
    // OpenAPI spec (because it was!) and now we've got all our special AWS values and variables interpolated.
    // This will get used as the `Body:` parameter in the underlying CloudFormation resource.
    const apiGateway = new SecureRestApi(this, "AtatSpecTest", {
      restApiName: `${props.environmentId} API`,
      apiDefinition: apigw.ApiDefinition.fromInline(apiSpecAsTemplateInclude),
      deployOptions: {
        tracingEnabled: true,
      },
    }).restApi;
<<<<<<< HEAD
    this.restApi = apiGateway;
=======
    this.addEmailRoutes(props);
>>>>>>> f803658 (Update atat-web-api-stack)
    this.addTaskOrderRoutes(props);
    this.ssmParams.push(
      new ssm.StringParameter(this, "ApiGatewayUrl", {
        description: "URL for the API Gateway",
        stringValue: apiGateway.urlForPath(),
        parameterName: `/atat/${this.environmentId}/api/url`,
      })
    );
  }

  private addEmailRoutes(props: AtatWebApiStackProps) {
    const smtpSecrets = secretsmanager.Secret.fromSecretNameV2(this, "SMTPSecrets", props.smtpProps.secretName);
    this.functions.push(
      new ApiSQSFunction(this, "SubmitEmails", {
        queue: this.emailQueue,
        // TODO: revert to deploy in the vpc, after networking issue resolved (temporary only)
        // lambdaVpc: props.vpc,
        method: HttpMethod.POST,
        handlerPath: this.determineApiHandlerPath("submitEmails", "emails/"),
      }).fn,
      new ApiSQSFunction(this, "SendEmails", {
        queue: this.emailQueue,
        // TODO: revert to deploy in the vpc, after networking issue resolved (temporary only)
        // lambdaVpc: props.vpc,
        method: HttpMethod.GET,
        handlerPath: this.determineApiHandlerPath("subscribeSendEmails", "emails/"),
        createEventSource: true,
        smtpSecrets: smtpSecrets,
        functionPropsOverride: {
          timeout: cdk.Duration.seconds(10),
          // deadLetterQueue: this.emailDeadLetterQueue,
          // retryAttempts: 0,
          environment: {
            SMTP: props.smtpProps.secretName,
          },
        },
      }).fn
    );
  }

  private addTaskOrderRoutes(props: AtatWebApiStackProps) {
    // Creates a server access log target bucket shared amongst the Task Order Lifecycle buckets
    // server access logs enabled on target bucket
    const taskOrdersAccessLogsBucket = new SecureBucket(this, "taskOrdersLogBucket", {
      logTargetBucket: "self", // access control set to LOG_DELIVERY_WRITE when "self"
      logTargetPrefix: "logs/logbucket/",
      bucketProps: {
        removalPolicy: props?.removalPolicy,
        autoDeleteObjects: props?.removalPolicy === cdk.RemovalPolicy.DESTROY,
      },
    });
    const taskOrderManagement = new TaskOrderLifecycle(this, "TaskOrders", {
      // enables server access logs for task order buckets (NIST SP 800-53 controls)
      logTargetBucket: taskOrdersAccessLogsBucket.bucket,
      logTargetPrefix: "logs/taskorders/",
      bucketProps: {
        removalPolicy: props?.removalPolicy,
        autoDeleteObjects: props?.removalPolicy === cdk.RemovalPolicy.DESTROY,
      },
    });
    this.functions.push(
      new ApiS3Function(this, "UploadTaskOrder", {
        lambdaVpc: props.vpc,
        bucket: taskOrderManagement.pendingBucket,
        method: HttpMethod.POST,
        handlerPath: this.determineApiHandlerPath("uploadTaskOrder", "taskOrderFiles/"),
        functionPropsOverride: {
          memorySize: 256,
        },
      }).fn,
      new ApiS3Function(this, "DeleteTaskOrder", {
        lambdaVpc: props.vpc,
        bucket: taskOrderManagement.acceptedBucket,
        method: HttpMethod.DELETE,
        handlerPath: this.determineApiHandlerPath("deleteTaskOrder", "taskOrderFiles/"),
      }).fn
    );

    // TODO: getTaskOrderMetadata
    // TODO: downloadTaskOrder
  }

  private determineApiHandlerPath(operationId: string, handlerFolder: string): string {
    return utils.packageRoot() + "/api/" + handlerFolder + utils.apiSpecOperationFileName(operationId);
  }

  private addDatabaseApiFunction(operationId: string, handlerFolder: string, vpc: ec2.IVpc) {
    const props = {
      table: this.table,
      lambdaVpc: vpc,
      method: utils.apiSpecOperationMethod(operationId),
      handlerPath: this.determineApiHandlerPath(operationId, handlerFolder),
    };
    this.functions.push(new ApiDynamoDBFunction(this, utils.apiSpecOperationFunctionName(operationId), props).fn);
  }

  private addQueueDatabaseApiFunction(operationId: string, handlerFolder: string, vpc: ec2.IVpc) {
    const props = {
      table: this.table,
      queue: this.submitQueue,
      lambdaVpc: vpc,
      method: utils.apiSpecOperationMethod(operationId),
      handlerPath: this.determineApiHandlerPath(operationId, handlerFolder),
      createEventSource: operationId.startsWith("subscribe"),
    };
    this.functions.push(new ApiSQSDynamoDBFunction(this, utils.apiSpecOperationFunctionName(operationId), props).fn);
  }

  private setupCognito(props: AtatIdpProps, removalPolicy?: cdk.RemovalPolicy) {
    const secret = secretsmanager.Secret.fromSecretNameV2(this, "OidcSecret", props.secretName);
    const cognitoAuthentication = new CognitoAuthentication(this, "Authentication", {
      groupsAttributeName: "groups",
      adminsGroupName: props.adminsGroupName ?? "atat-admins",
      usersGroupName: props.usersGroupName ?? "atat-users",
      cognitoDomain: "atat-api-" + this.environmentId,
      userPoolProps: {
        removalPolicy: removalPolicy,
      },
      oidcIdps: [
        {
          providerName: props.providerName,
          clientId: secret.secretValueFromJson("clientId"),
          clientSecret: secret.secretValueFromJson("clientSecret"),
          oidcIssuerUrl: secret.secretValueFromJson("oidcIssuerUrl"),
          attributesRequestMethod: HttpMethod.GET,
        },
      ],
    });
    this.ssmParams.push(
      new ssm.StringParameter(this, "UserPoolIdParameter", {
        description: "Cognito User Pool ID",
        stringValue: cognitoAuthentication.userPool.userPoolId,
        parameterName: `/atat/${this.environmentId}/cognito/userpool/id`,
      }),
      new ssm.StringListParameter(this, "CognitoIdPNamesParameter", {
        description: "Names of configured identity providers",
        parameterName: `/atat/${this.environmentId}/cognito/idps`,
        stringListValue: cognitoAuthentication.idps.map((idp) => idp.providerName),
      })
    );
  }
}
