import * as apigw from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as s3asset from "@aws-cdk/aws-s3-assets";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ssm from "@aws-cdk/aws-ssm";
import * as cdk from "@aws-cdk/core";
import { ApiDynamoDBFunction } from "./constructs/api-dynamodb-function";
import { ApiSQSFunction } from "./constructs/api-sqs-function";
import { ApiS3Function } from "./constructs/api-s3-function";
import { CognitoAuthentication } from "./constructs/authentication";
import { SecureBucket, SecureTable, SecureRestApi, SecureQueue } from "./constructs/compliant-resources";
import { TaskOrderLifecycle } from "./constructs/task-order-lifecycle";
import { HttpMethod } from "./http";
import { packageRoot } from "./util";

interface AtatIdpProps {
  secretName: string;
  providerName: string;
  adminsGroupName?: string;
  usersGroupName?: string;
}

export interface AtatWebApiStackProps extends cdk.StackProps {
  environmentId: string;
  idpProps: AtatIdpProps;
  removalPolicy?: cdk.RemovalPolicy;
  requireAuthorization?: boolean;
}

export class AtatWebApiStack extends cdk.Stack {
  private readonly environmentId: string;
  constructor(scope: cdk.Construct, id: string, props: AtatWebApiStackProps) {
    super(scope, id, props);

    this.templateOptions.description = "Resources to support the ATAT application API";

    this.environmentId = props.environmentId;
    this.setupCognito(props.idpProps, props.removalPolicy);

    // Create a shared DynamoDB table that will be used by all the functions in the project.
    const { table } = new SecureTable(this, "AtatTable", {
      tableProps: {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: props?.removalPolicy,
      },
    });
    const tableOutput = new cdk.CfnOutput(this, "TableName", {
      value: table.tableName,
    });

    const { queue } = new SecureQueue(this, "SubmitQueue", { queueProps: { queueName: "SubmitQueue" } });

    const forceAuth = new cdk.CfnCondition(this, "ForceAuthorization", {
      expression: cdk.Fn.conditionEquals(props?.requireAuthorization ?? true, true),
    });
    forceAuth.overrideLogicalId("IsAuthorizationRequired");

    const createPortfolioStep = new ApiDynamoDBFunction(this, "CreatePortfolioStep", {
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/portfolio/createPortfolioStep.ts",
    });

    const createPortfolioDraft = new ApiDynamoDBFunction(this, "CreatePortfolioDraft", {
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/createPortfolioDraft.ts",
    });

    const getPortfolioDrafts = new ApiDynamoDBFunction(this, "GetPortfolioDrafts", {
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/getPortfolioDrafts.ts",
    });

    const deletePortfolioDraft = new ApiDynamoDBFunction(this, "DeletePortfolioDraft", {
      table: table,
      method: HttpMethod.DELETE,
      handlerPath: packageRoot() + "/api/portfolioDrafts/deletePortfolioDraft.ts",
    });

    const getPortfolioStep = new ApiDynamoDBFunction(this, "GetPortfolioStep", {
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/portfolio/getPortfolioStep.ts",
    });

    const createFundingStep = new ApiDynamoDBFunction(this, "CreateFundingStep", {
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/funding/createFundingStep.ts",
    });

    const getFundingStep = new ApiDynamoDBFunction(this, "GetFundingStep", {
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/funding/getFundingStep.ts",
    });

    const createApplicationStep = new ApiDynamoDBFunction(this, "CreateApplicationStep", {
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/application/createApplicationStep.ts",
    });

    const getApplicationStep = new ApiDynamoDBFunction(this, "GetApplicationStep", {
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/application/getApplicationStep.ts",
    });

    const getPortfolioDraft = new ApiDynamoDBFunction(this, "GetPortfolioDraft", {
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/getPortfolioDraft.ts",
    });

    const submitPortfolioDraft = new ApiSQSFunction(this, "SubmitPortfolioDraft", {
      queue: queue,
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/submit/submitPortfolioDraft.ts",
    });

    const subscribePortfolioDraftRequest = new ApiSQSFunction(this, "subscribePortfolioDraftRequest", {
      table: table,
      queue: queue,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/submit/subscribe.ts",
      createEventSource: true,
    });

    // All TODO functions will be pointed at this lambda function (in the atat_provisioning_wizard_api.yaml, search NotImplementedFunction)
    const notImplemented = new ApiDynamoDBFunction(this, "NotImplemented", {
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/notImplemented.ts",
    });

    // The API spec, which just so happens to be a valid CloudFormation snippet (with some actual CloudFormation
    // in it) gets uploaded to S3. The Asset resource reuses the same bucket that the CDK does, so this does not
    // require any additional buckets to be created.
    const apiAsset = new s3asset.Asset(this, "ApiSpecAsset", {
      path: packageRoot() + "../../atat_provisioning_wizard_api.yaml",
    });

    // And now we include that snippet as an actual part of the template using the AWS::Include Transform. Since
    // snippet is valid CloudFormation with real Fn::Sub invocations, those will be interpreted. This results in
    // all of the function ARNs being inserted into the x-aws-apigateway-integration resources when the template
    // is evaluated.
    const apiSpecAsTemplateInclude = cdk.Fn.transform("AWS::Include", { Location: apiAsset.s3ObjectUrl });

    // And with the data now loaded from the template, we can use ApiDefinition.fromInline to parse it as real
    // OpenAPI spec (because it was!) and now we've got all our special AWS values and variables interpolated.
    // This will get used as the `Body:` parameter in the underlying CloudFormation resource.
    const restApi = new SecureRestApi(this, "AtatSpecTest", {
      apiDefinition: apigw.ApiDefinition.fromInline(apiSpecAsTemplateInclude),
    });
    this.addTaskOrderRoutes(props);
  }

  private addTaskOrderRoutes(props?: AtatWebApiStackProps) {
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
    const uploadTaskOrder = new ApiS3Function(this, "UploadTaskOrder", {
      bucket: taskOrderManagement.pendingBucket,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/taskOrderFiles/uploadTaskOrder.ts",
      functionPropsOverride: {
        memorySize: 256,
      },
    });
    const deleteTaskOrder = new ApiS3Function(this, "DeleteTaskOrder", {
      bucket: taskOrderManagement.acceptedBucket,
      method: HttpMethod.DELETE,
      handlerPath: packageRoot() + "/api/taskOrderFiles/deleteTaskOrder.ts",
    });

    // TODO: getTaskOrderMetadata
    // TODO: downloadTaskOrder
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
    const poolIdParam = new ssm.StringParameter(this, "UserPoolIdParameter", {
      description: "Cognito User Pool ID",
      stringValue: cognitoAuthentication.userPool.userPoolId,
      parameterName: `/atat/${this.environmentId}/cognito/userpool/id`,
    });
    const idpNamesParam = new ssm.StringListParameter(this, "CognitoIdPNamesParameter", {
      description: "Names of configured identity providers",
      parameterName: `/atat/${this.environmentId}/cognito/idps`,
      stringListValue: cognitoAuthentication.idps.map((idp) => idp.providerName),
    });
  }
}
