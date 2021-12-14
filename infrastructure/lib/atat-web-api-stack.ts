import * as apigw from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as s3asset from "@aws-cdk/aws-s3-assets";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as logs from "@aws-cdk/aws-logs";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ssm from "@aws-cdk/aws-ssm";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as sqs from "@aws-cdk/aws-sqs";
import * as iam from "@aws-cdk/aws-iam";
import { SfnLambdaInvokeTask } from "./constructs/sfnLambdaInvokeTask";
import { SfnPassState } from "./constructs/sfnPass";
import { AuthenticationProtocol, CognitoAuthentication } from "./constructs/authentication";
import {
  SecureBucket,
  SecureQueue,
  SecureRestApi,
  SecureStateMachine,
  SecureTable,
} from "./constructs/compliant-resources";
import { TaskOrderLifecycle } from "./constructs/task-order-lifecycle";
import { HttpMethod } from "./http";
import { TablePermissions, QueuePermissions, BucketPermissions } from "./resource-permissions";
import * as utils from "./util";
import { ApiFlexFunction, ApiFunctionPropstest } from "./constructs/lambda-fn";
import { Database } from "./constructs/database";
import { Duration } from "@aws-cdk/core";

interface AtatIdpProps {
  secretName: string;
  providerName: string;
  providerType: AuthenticationProtocol;
}

interface CognitoGroupConfig {
  adminsGroupName?: string;
  usersGroupName?: string;
}

interface AtatSmtpProps {
  secretName: string;
}

export interface AtatWebApiStackProps extends cdk.StackProps {
  environmentId: string;
  idpProps: AtatIdpProps[];
  cognitoGroups?: CognitoGroupConfig;
  requireAuthorization?: boolean;
  smtpProps: AtatSmtpProps;
  vpc: ec2.IVpc;
}

export class AtatWebApiStack extends cdk.Stack {
  private readonly environmentId: string;
  /**
   * @deprecated Use {@link internaApi} instead
   */
  public readonly draftApi: apigw.IRestApi;
  public readonly internalApi: apigw.IRestApi;
  public readonly submitQueue: sqs.IQueue;
  public readonly emailQueue: sqs.IQueue;
  public readonly emailDeadLetterQueue: sqs.IQueue;
  public readonly provisioningStateMachine: sfn.IStateMachine;
  public readonly table: dynamodb.ITable;
  public readonly database: Database;
  public readonly ormLayer: lambda.ILayerVersion;
  public readonly functions: lambda.IFunction[] = [];
  public readonly ssmParams: ssm.IParameter[] = [];
  public readonly outputs: cdk.CfnOutput[] = [];

  constructor(scope: cdk.Construct, id: string, props: AtatWebApiStackProps) {
    super(scope, id, props);

    this.templateOptions.description = "Resources to support the ATAT application API";
    this.environmentId = props.environmentId;

    this.setupCognito(props.idpProps, props.cognitoGroups);

    // Create a shared DynamoDB table that will be used by all the functions in the project.
    this.table = new SecureTable(this, "AtatTable", {
      tableProps: {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      },
    }).table;
    this.outputs.push(
      new cdk.CfnOutput(this, "TableName", {
        value: this.table.tableName,
      })
    );

    this.ormLayer = new lambda.LayerVersion(this, "DatabaseSupportLayer", {
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      code: lambda.Code.fromAsset(utils.packageRoot() + "/../", {
        bundling: {
          image: lambda.Runtime.NODEJS_14_X.bundlingImage,
          user: "root",
          command: ["bash", "scripts/prepare-db-layer.sh"],
        },
        assetHashType: cdk.AssetHashType.OUTPUT,
      }),
    });

    this.database = new Database(this, "AtatDatabase", {
      vpc: props.vpc,
      databaseName: this.environmentId + "atat",
      ormLambdaLayer: this.ormLayer,
    });

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

    // Portfolios Operations using the internal API spec
    this.addDatabaseApiFunction("getEnvironments", "portfolios/environments/", props.vpc, TablePermissions.READ);
    this.addDatabaseApiFunction("createEnvironment", "portfolios/environments/", props.vpc, TablePermissions.WRITE);
    this.addDatabaseApiFunction("updateEnvironment", "portfolios/environments/", props.vpc, TablePermissions.WRITE);

    // PortfolioDraft Operations
    this.addDatabaseApiFunction("getPortfolioDrafts", "portfolioDrafts/", props.vpc, TablePermissions.READ);
    this.addDatabaseApiFunction("getPortfolioDraft", "portfolioDrafts/", props.vpc, TablePermissions.READ);
    this.addDatabaseApiFunction("createPortfolioDraft", "portfolioDrafts/", props.vpc, TablePermissions.READ_WRITE);
    this.addDatabaseApiFunction("deletePortfolioDraft", "portfolioDrafts/", props.vpc, TablePermissions.READ_WRITE);
    // NotImplemented is the "default" method for unimplemented operations
    this.addDatabaseApiFunction("notImplemented", "portfolioDrafts/", props.vpc, TablePermissions.READ);

    // PortfolioStep Operations (all files in the portfolio/ folder)
    this.addDatabaseApiFunction("getPortfolioStep", "portfolioDrafts/portfolio/", props.vpc, TablePermissions.READ);
    this.addDatabaseApiFunction(
      "createPortfolioStep",
      "portfolioDrafts/portfolio/",
      props.vpc,
      TablePermissions.READ_WRITE
    );

    // FundingStep Operations (all files live in the funding/ folder)
    this.addDatabaseApiFunction("getFundingStep", "portfolioDrafts/funding/", props.vpc, TablePermissions.READ);
    this.addDatabaseApiFunction(
      "createFundingStep",
      "portfolioDrafts/funding/",
      props.vpc,
      TablePermissions.READ_WRITE
    );

    // ApplicationStep Operations (all files live in the application/ folder)
    this.addDatabaseApiFunction("getApplicationStep", "portfolioDrafts/application/", props.vpc, TablePermissions.READ);
    this.addDatabaseApiFunction(
      "createApplicationStep",
      "portfolioDrafts/application/",
      props.vpc,
      TablePermissions.READ_WRITE
    );

    // Submission operations (all files live in the submit/ folder)
    this.addQueueDatabaseApiFunction(
      "submitPortfolioDraft",
      "portfolioDrafts/submit/",
      props.vpc,
      TablePermissions.READ_WRITE,
      QueuePermissions.SEND
    );

    // Internal API Operations
    this.addDatabaseApiFunction("createApplication", "portfolios/application/", props.vpc, TablePermissions.WRITE);

    // The API spec, which just so happens to be a valid CloudFormation snippet (with some actual CloudFormation
    // in it) gets uploaded to S3. The Asset resource reuses the same bucket that the CDK does, so this does not
    // require any additional buckets to be created.
    const draftApiAsset = new s3asset.Asset(this, "DraftApiSpecAsset", {
      path: utils.packageRoot() + "../../atat_provisioning_wizard_api.yaml",
    });
    const internalApiAsset = new s3asset.Asset(this, "InternalApiSpecAsset", {
      path: utils.packageRoot() + "../../atat_internal_api.yaml",
    });

    // And now we include that snippet as an actual part of the template using the AWS::Include Transform. Since
    // snippet is valid CloudFormation with real Fn::Sub invocations, those will be interpreted. This results in
    // all of the function ARNs being inserted into the x-aws-apigateway-integration resources when the template
    // is evaluated.
    const draftApiSpecAsTemplateInclude = cdk.Fn.transform("AWS::Include", { Location: draftApiAsset.s3ObjectUrl });
    const internalApiSpecAsTemplateInclude = cdk.Fn.transform("AWS::Include", {
      Location: internalApiAsset.s3ObjectUrl,
    });

    // And with the data now loaded from the template, we can use ApiDefinition.fromInline to parse it as real
    // OpenAPI spec (because it was!) and now we've got all our special AWS values and variables interpolated.
    // This will get used as the `Body:` parameter in the underlying CloudFormation resource.
    const draftApiGateway = new SecureRestApi(this, "AtatDraftApi", {
      restApiName: `${props.environmentId} Draft API`,
      apiDefinition: apigw.ApiDefinition.fromInline(draftApiSpecAsTemplateInclude),
      deployOptions: {
        tracingEnabled: true,
      },
    }).restApi;
    const internalApiGateway = new SecureRestApi(this, "AtatInternalApi", {
      restApiName: `${props.environmentId} Internal API`,
      apiDefinition: apigw.ApiDefinition.fromInline(internalApiSpecAsTemplateInclude),
      deployOptions: {
        tracingEnabled: true,
      },
    }).restApi;

    // Adds a temporary route on the internal gateway that basically does nothing
    // except internally log some information about connecting to the database.
    internalApiGateway.root.addResource("db-test").addMethod(
      "GET",
      new apigw.LambdaIntegration(
        new ApiFlexFunction(this, "DbTest", {
          lambdaVpc: props.vpc,
          ormLayer: this.ormLayer,
          database: this.database,
          tablePermissions: TablePermissions.READ_WRITE,
          handlerPath: utils.packageRoot() + "/api/dbTest.ts",
          functionPropsOverride: {
            // Allow for an unreasonably high timeout so that it's easier
            // to debug issues; this is not a production route and so allowing
            // this to take awhile actually will allow for catching logs and
            // other performance information
            timeout: cdk.Duration.minutes(1),
          },
        }).fn
      )
    );

    // Provisioning State machine functions
    // All but one function reuse API functions in the state machine. The validatePortfolio
    // function does not require any AWS service so a simple constructor function was used.
    // These functions also touch on a refactoring for the design of these functions that
    // move away from the use case of the API functions.
    const provisioningRequest = new lambdaNodeJs.NodejsFunction(
      this,
      utils.apiSpecOperationFunctionName("provisioningRequest"),
      {
        entry: utils.packageRoot() + "/api/provision/provisioningRequest.ts",
        vpc: props.vpc,
        bundling: {
          forceDockerBundling: true,
        },
      }
    );
    const persistCspResponse = new ApiFlexFunction(this, utils.apiSpecOperationFunctionName("persistPortfolioDraft"), {
      table: this.table,
      lambdaVpc: props.vpc,
      method: HttpMethod.POST,
      handlerPath: this.determineApiHandlerPath("persistPortfolioDraft", "provision/"),
    });
    const rejectPortfolio = new ApiFlexFunction(this, utils.apiSpecOperationFunctionName("rejectPortfolioDraft"), {
      table: this.table,
      lambdaVpc: props.vpc,
      method: HttpMethod.POST,
      handlerPath: this.determineApiHandlerPath("rejectPortfolioDraft", "provision/"),
    });
    this.functions.push(provisioningRequest, persistCspResponse.fn, rejectPortfolio.fn);

    // State machine tasks/passes
    const provisioningPass = new SfnPassState(this, "ProvisioningPass", {
      sfnPass: {
        comment: "Pass state that passes the original input along with a status code used later in the state machine.",
        inputPath: "$",
        parameters: {
          // temporarily hardcoded status code to always reach the persistCspResponseTask
          response: { statusCode: 200 },
          input: sfn.JsonPath.stringAt("$"),
        },
        resultPath: "$.passRequest",
      },
    }).sfnPass;
    const provisioningTask = new SfnLambdaInvokeTask(this, "ProvisioningTask", {
      sfnTask: {
        lambdaFunction: provisioningRequest,
        timeout: cdk.Duration.seconds(60),
        // "$"" sends all of the input to the lambda function, and in this task is coming from the
        // SQS message being sent with the start of the step function execution
        inputPath: "$",
        // ResultSelector allows you to select and shape the raw output from the lambda which is
        // placed in the resultPath. In this task the result is placed inside of "$.request" for the
        // next task. ResultSelector is optional, but if there is a particular shape or information
        // that the output should it can help.
        resultSelector: {
          body: sfn.JsonPath.stringAt("$.Payload.body"),
          type: sfn.JsonPath.stringAt("$.Payload.type"),
          csp: sfn.JsonPath.stringAt("$.Payload.csp"),
        },
        // ResultPath is being combined with the original input under "request".
        // If no resultPath is specified the entire input is replaced with the output which is
        // effectively setting ResultPath to "$".
        resultPath: "$.request",
        // "$" outputs the original input, in addition to the "$.request" output from the lambda
        // this can be cut down, by specifying only what you want (e.g., $.request) to be
        // sent to the next state
        outputPath: "$",
      },
    }).sfnTask;
    const transformRequestTask = new SfnLambdaInvokeTask(this, "TranslateToCspApiRequest", {
      sfnTask: {
        lambdaFunction: provisioningRequest,
        inputPath: "$.request",
        resultSelector: {
          body: sfn.JsonPath.stringAt("$.Payload.body"),
        },
        resultPath: "$.transformedRequest",
        outputPath: "$",
      },
    }).sfnTask;
    const invokeCspApiTask = new SfnLambdaInvokeTask(this, "InvokeCspApi", {
      sfnTask: {
        lambdaFunction: provisioningRequest,
        inputPath: "$",
        resultSelector: {
          statusCode: sfn.JsonPath.stringAt("$.Payload.passRequest.response.statusCode"),
          body: sfn.JsonPath.stringAt("$.Payload.body"),
          retryCount: sfn.JsonPath.stringAt("$$.State.RetryCount"),
        },
        resultPath: "$.cspResponse",
        outputPath: "$",
      },
    }).sfnTask;
    const persistCspResponseTask = new SfnLambdaInvokeTask(this, "PersistCspTask", {
      // update provisioning status to 'complete'
      sfnTask: {
        lambdaFunction: persistCspResponse.fn,
        inputPath: "$.cspResponse",
      },
    }).sfnTask;
    const rejectResponseTask = new SfnLambdaInvokeTask(this, "RejectPortfolioTask", {
      // update provisioning status to 'failed'
      sfnTask: {
        lambdaFunction: rejectPortfolio.fn,
        inputPath: "$.cspResponse",
      },
    }).sfnTask;

    // State machine conditions
    const successResponse = sfn.Condition.numberEquals("$.cspResponse.statusCode", 200);
    const clientErrorResponse = sfn.Condition.or(
      sfn.Condition.numberEquals("$.cspResponse.statusCode", 400),
      sfn.Condition.numberEquals("$.cspResponse.statusCode", 402),
      sfn.Condition.numberEquals("$.cspResponse.statusCode", 404)
    );
    const maxRetries = sfn.Condition.and(
      sfn.Condition.numberGreaterThan("$.cspResponse.retryCount", 6),
      sfn.Condition.numberGreaterThanEquals("$.cspResponse.statusCode", 500)
    );
    const internalErrorResponse = sfn.Condition.numberGreaterThanEquals("$.cspResponse.statusCode", 500);

    // State machine choices
    const httpResponseChoices = new sfn.Choice(this, "HttpResponse")
      .when(successResponse, persistCspResponseTask)
      .when(clientErrorResponse, rejectResponseTask)
      .when(maxRetries, rejectResponseTask)
      .when(internalErrorResponse, invokeCspApiTask);

    // Composing state machine
    const stateMachineWorkflow = provisioningPass
      .next(provisioningTask) // previously used for input validation, but removed
      .next(transformRequestTask)
      .next(invokeCspApiTask)
      .next(httpResponseChoices);
    const stateMachineLogGroup = new logs.LogGroup(this, "StepFunctionsLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      logGroupName: `/aws/vendedlogs/states/StepFunctionsLogs${this.environmentId}`,
    });
    this.provisioningStateMachine = new SecureStateMachine(this, "ProvisioningStateMachine", {
      stateMachineProps: {
        definition: stateMachineWorkflow,
      },
      logGroup: stateMachineLogGroup,
    }).stateMachine;

    // Functions that are triggered by events in the submit queue
    // These, for now, can be treated just like regular API functions because they look
    // and act like them in nearly every way except being accessible via API Gateway.
    // This may require more significant refactoring as the design for these functions
    // is further fleshed out.
    this.functions.push(
      // This function is outside of step functions to provide the portfolio draft from the SQS
      // and start the state machine execution. The services available to invoke Step Functions
      // are limited. Therefore the previous subscribePortfolioDraftSubmissions function is being
      // repurposed (name changed) to also invoke the state machine for portfolio provisioning.
      // See https://docs.aws.amazon.com/step-functions/latest/dg/concepts-invoke-sfn.html
      new ApiFlexFunction(this, utils.apiSpecOperationFunctionName("consumePortfolioDraftSubmitQueue"), {
        queue: this.submitQueue,
        stateMachine: this.provisioningStateMachine,
        lambdaVpc: props.vpc,
        // Limiting to a batch of 1 to prevent portfolios from failing in batches.
        // If one fails in a batch, all of the messages in that batch will also fail,
        // which may cause portfolio drafts to be processed twice or cause other
        // portfolios to never be processed.
        batchSize: 1,
        method: HttpMethod.GET,
        handlerPath: this.determineApiHandlerPath("consumePortfolioDraftSubmitQueue", "provision/"),
        createEventSource: true,
        queuePermissions: QueuePermissions.CONSUME,
      }).fn
    );

    this.draftApi = draftApiGateway;
    this.internalApi = internalApiGateway;
    this.addEmailRoutes(props);
    this.addTaskOrderRoutes(props);
    this.ssmParams.push(
      new ssm.StringParameter(this, "DraftApiGatewayUrl", {
        description: "URL for the Draft API Gateway instance",
        stringValue: draftApiGateway.urlForPath(),
        parameterName: `/atat/${this.environmentId}/draftApi/url`,
      })
    );
    this.ssmParams.push(
      new ssm.StringParameter(this, "InternalApiGatewayUrl", {
        description: "URL for the Internal API Gateway instance",
        stringValue: draftApiGateway.urlForPath(),
        parameterName: `/atat/${this.environmentId}/internalApi/url`,
      })
    );
  }

  private addEmailRoutes(props: AtatWebApiStackProps) {
    const smtpSecrets = secretsmanager.Secret.fromSecretNameV2(this, "SMTPSecrets", props.smtpProps.secretName);
    const processEmailsPath = utils.packageRoot() + "/email/processingEmails/index.ts";

    const sendEmailFn = new ApiFlexFunction(this, "SendEmails", {
      queue: this.emailQueue,
      // TODO(AT-6764): revert to deploy in the vpc, after networking issue resolved (temporary only)
      // lambdaVpc: props.vpc,
      method: HttpMethod.GET,
      handlerPath: processEmailsPath,
      createEventSource: true,
      queuePermissions: QueuePermissions.CONSUME,
      batchSize: 1,
      smtpSecrets: smtpSecrets,
      functionPropsOverride: {
        timeout: cdk.Duration.seconds(10),
        environment: {
          SMTP_SECRET_NAME: props.smtpProps.secretName,
        },
      },
    }).fn;

    const rolesToGrant = [
      iam.Role.fromRoleArn(this, "DeveloperRoleArn", cdk.Fn.importValue("AtatDeveloperRoleArn")),
      iam.Role.fromRoleArn(this, "QaRoleArn", cdk.Fn.importValue("AtatQaTestRoleArn")),
    ];
    const temporaryTestInvokePolicy = new iam.Policy(this, "GrantTemporarySendEmailInvoke", {
      statements: [
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction", "lambda:GetFunction*"],
          resources: [sendEmailFn.functionArn],
        }),
      ],
    });

    // Temporarily grant developers access to invoke the function
    for (const role of rolesToGrant) {
      role.attachInlinePolicy(temporaryTestInvokePolicy);
    }

    this.functions.push(sendEmailFn);
  }

  private addTaskOrderRoutes(props: AtatWebApiStackProps) {
    // Creates a server access log target bucket shared amongst the Task Order Lifecycle buckets
    // server access logs enabled on target bucket
    const taskOrdersAccessLogsBucket = new SecureBucket(this, "taskOrdersLogBucket", {
      logTargetBucket: "self", // access control set to LOG_DELIVERY_WRITE when "self"
      logTargetPrefix: "logs/logbucket/",
    });
    const taskOrderManagement = new TaskOrderLifecycle(this, "TaskOrders", {
      // enables server access logs for task order buckets (NIST SP 800-53 controls)
      logTargetBucket: taskOrdersAccessLogsBucket.bucket,
      logTargetPrefix: "logs/taskorders/",
    });
    this.functions.push(
      new ApiFlexFunction(this, "UploadTaskOrder", {
        lambdaVpc: props.vpc,
        bucket: taskOrderManagement.pendingBucket,
        bucketPermissions: BucketPermissions.PUT,
        method: HttpMethod.POST,
        handlerPath: this.determineApiHandlerPath("uploadTaskOrder", "taskOrderFiles/"),
        functionPropsOverride: {
          memorySize: 256,
        },
      }).fn,
      new ApiFlexFunction(this, "DeleteTaskOrder", {
        lambdaVpc: props.vpc,
        bucket: taskOrderManagement.acceptedBucket,
        method: HttpMethod.DELETE,
        bucketPermissions: BucketPermissions.DELETE,
        handlerPath: this.determineApiHandlerPath("deleteTaskOrder", "taskOrderFiles/"),
      }).fn
    );

    // TODO: getTaskOrderMetadata
    // TODO: downloadTaskOrder
  }

  private determineApiHandlerPath(operationId: string, handlerFolder: string): string {
    return utils.packageRoot() + "/api/" + handlerFolder + utils.apiSpecOperationFileName(operationId);
  }

  private addDatabaseApiFunction(
    operationId: string,
    handlerFolder: string,
    vpc: ec2.IVpc,
    permissions: TablePermissions
  ) {
    const props: ApiFunctionPropstest = {
      table: this.table,
      tablePermissions: permissions,
      lambdaVpc: vpc,
      method: utils.apiSpecOperationMethod(operationId),
      handlerPath: this.determineApiHandlerPath(operationId, handlerFolder),
      database: this.database,
      ormLayer: this.ormLayer,
      functionPropsOverride: {
        timeout: Duration.seconds(10),
      },
    };
    this.functions.push(new ApiFlexFunction(this, utils.apiSpecOperationFunctionName(operationId), props).fn);
  }

  private addQueueDatabaseApiFunction(
    operationId: string,
    handlerFolder: string,
    vpc: ec2.IVpc,
    tablePermissions: TablePermissions,
    queuePermissions: QueuePermissions
  ) {
    const props: ApiFunctionPropstest = {
      table: this.table,
      tablePermissions: tablePermissions,
      queue: this.submitQueue,
      queuePermissions: queuePermissions,
      lambdaVpc: vpc,
      method: utils.apiSpecOperationMethod(operationId),
      handlerPath: this.determineApiHandlerPath(operationId, handlerFolder),
      createEventSource: operationId.startsWith("consume"),
      database: this.database,
      ormLayer: this.ormLayer,
    };
    this.functions.push(new ApiFlexFunction(this, utils.apiSpecOperationFunctionName(operationId), props).fn);
  }

  private setupCognito(idps: AtatIdpProps[], groupConfig?: CognitoGroupConfig) {
    const cognitoAuthentication = new CognitoAuthentication(this, "Authentication", {
      groupsAttributeName: "groups",
      adminsGroupName: groupConfig?.adminsGroupName ?? "atat-admins",
      usersGroupName: groupConfig?.usersGroupName ?? "atat-users",
      cognitoDomain: "atat-api-" + this.environmentId,
      samlIdps: idps
        .filter((idpConfig) => idpConfig.providerType === AuthenticationProtocol.SAML)
        .map((idpConfig) => {
          const secret = secretsmanager.Secret.fromSecretNameV2(
            this,
            `SamlSecret${idpConfig.providerName}`,
            idpConfig.secretName
          );
          return {
            providerName: idpConfig.providerName,
            metadataURL: secret.secretValueFromJson("metadataUrl"),
          };
        }),
      oidcIdps: idps
        .filter((idpConfig) => idpConfig.providerType === AuthenticationProtocol.OIDC)
        .map((idpConfig) => {
          const secret = secretsmanager.Secret.fromSecretNameV2(
            this,
            `OidcSecret${idpConfig.providerName}`,
            idpConfig.secretName
          );
          return {
            providerName: idpConfig.providerName,
            clientId: secret.secretValueFromJson("clientId"),
            clientSecret: secret.secretValueFromJson("clientSecret"),
            oidcIssuerUrl: secret.secretValueFromJson("oidcIssuerUrl"),
            attributesRequestMethod: HttpMethod.GET,
          };
        }),
    });
    // When utilizing a custom domain, the `domainName` property of IUserPoolDomain
    // contains the full domain; however, in other scenarios, it contains only the
    // prefix.
    const fullDomainName = `${cognitoAuthentication.userPoolDomain.domainName}.auth-fips.${cdk.Aws.REGION}.amazoncognito.com`;
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
      }),
      new ssm.StringParameter(this, "CognitoDomainParameter", {
        description: "Cognito domain",
        parameterName: `/atat/${this.environmentId}/cognito/domain`,
        stringValue: fullDomainName,
      })
    );
  }
}
