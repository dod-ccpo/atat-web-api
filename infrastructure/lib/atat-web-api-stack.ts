import * as apigw from "@aws-cdk/aws-apigateway";
import { UserPool } from "@aws-cdk/aws-cognito";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as cdk from "@aws-cdk/core";
import { ApiDynamoDBFunction } from "./constructs/api-dynamodb-function";
import { ApiS3Function } from "./constructs/api-s3-function";
import { TaskOrderLifecycle } from "./constructs/task-order-lifecycle";
import { HttpMethod } from "./http";
import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";
import { JsonSchemaType, Model } from "@aws-cdk/aws-apigateway";

// This is a suboptimal solution to finding the relative directory to the
// package root. This is necessary because it is possible for this file to be
// run with the a cwd of either the infrastructure directory or the root of the
// git repo.
function packageRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith("infrastructure")) {
    return `${cwd}/../packages`;
  }
  return `${cwd}/packages`;
}

export class AtatWebApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a shared DynamoDB table that will be used by all the functions in the project.
    const table = new dynamodb.Table(this, "AtatTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });
    const tableOutput = new cdk.CfnOutput(this, "TableName", {
      value: table.tableName,
    });

    const userPool = new UserPool(this, "PocUserPool");
    const userPoolClient = userPool.addClient("api-app-client", {
      authFlows: {
        userPassword: true,
      },
    });
    // Ugly hack to quickly isolate deployments for developers.  To be improved/removed later.
    const ticketId = (this.node.tryGetContext("TicketId") || "").toLowerCase();
    const userPoolDomain = userPool.addDomain("api-app-domain", {
      cognitoDomain: {
        domainPrefix: ticketId + "atatapi",
      },
    });
    const poolDomainOutput = new cdk.CfnOutput(this, "UserPoolDomain", {
      value: userPoolDomain.domainName,
    });

    // Creates a shared API Gateway that all the functions will be able to add routes to.
    // Ideally we'd define different stages for dev, test, and staging. For now, a single
    // stage for everything being dev is good enough for a proof of concept

    const restApi = new apigw.SpecRestApi(this, "AtatSpecTest", {
      apiDefinition: apigw.ApiDefinition.fromAsset("../atat-web-api/infrastructure/atat_api.yaml"),
      endpointTypes: [apigw.EndpointType.REGIONAL],
      parameters: {
        endpointConfigurationTypes: apigw.EndpointType.REGIONAL,
      },
    });
    /*
    const restApi = new apigw.RestApi(this, "AtatWebApi", {
      binaryMediaTypes: ["multipart/form-data"],
      endpointConfiguration: {
        types: [apigw.EndpointType.REGIONAL],
      },
      defaultCorsPreflightOptions: {
        allowCredentials: false,
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: apigw.Cors.DEFAULT_HEADERS,
      },
    });

    restApi.root.addMethod("ANY");

    const restUrlOutput = new cdk.CfnOutput(this, "RootApiUri", {
      value: restApi.url ?? "",
    });
    */

    /**
     * A Validator
     */

    const requestValidator = new apigw.RequestValidator(this, "AwesomePayloadValidator", {
      restApi: restApi,
      requestValidatorName: `my-payload-validator`,
      validateRequestBody: true,
    });
    const sharedFunctionProps: lambdaNodejs.NodejsFunctionProps = {
      environment: {
        ATAT_TABLE_NAME: table.tableName,
      },
      bundling: {
        externalModules: ["aws-sdk"],
      },
    };
    const portfolioDrafts = restApi.root.addResource("portfolioDrafts");
    const portfolioDraftId = portfolioDrafts.addResource("{portfolioDraftId}");
    const portfolio = portfolioDraftId.addResource("portfolio");
    const createPortfolioDraftFn = new lambdaNodejs.NodejsFunction(this, "CreatePortfolioDraftFunction", {
      entry: packageRoot() + "/api/portfolioDrafts/createPortfolioDraft.ts",
      ...sharedFunctionProps,
    });

    portfolioDrafts.addMethod("POST", new apigw.LambdaIntegration(createPortfolioDraftFn));
    table.grantReadWriteData(createPortfolioDraftFn);

    // createPortfolioStep
    const createPortfolioStepFn = new lambdaNodejs.NodejsFunction(this, "CreatePortfolioStepFunction", {
      entry: packageRoot() + "/api/portfolioDrafts/portfolio/createPortfolioStep.ts",
      ...sharedFunctionProps,
    });
    const portfolioStepIntegration = new apigw.LambdaIntegration(createPortfolioStepFn, { proxy: true });

    const model = new apigw.Model(this, "AwesomeValidationModel", {
      modelName: "myValidationModel", // `myproject-${stage}-validate-payload-model`,
      restApi: restApi,
      contentType: "application/json", // this is necessary - even thought they mention it's an optional param
      description: "Payload used to validate your requests",
      schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: JsonSchemaType.STRING,
          },
          description: {
            type: JsonSchemaType.STRING,
          },
          dod_components: {
            type: JsonSchemaType.ARRAY,
            items: {
              type: JsonSchemaType.STRING,
              enum: [
                "air_force",
                "army",
                "marine_corps",
                "navy",
                "space_force",
                "combatant_command",
                "joint_staff",
                "dafa",
                "osd_psas",
                "nsa",
              ],
            },
          },
          portfolio_managers: { type: JsonSchemaType.ARRAY, items: { type: JsonSchemaType.STRING, format: "email" } },
        },
        required: ["name"],
      },
    });

    /*
    portfolio.addMethod("POST", new apigw.LambdaIntegration(createPortfolioStepFn), {
      requestValidator: myValidator,
    }); */
    portfolio.addMethod("POST", portfolioStepIntegration, {
      requestValidator: requestValidator,
      requestModels: { "application/json": model },
      requestParameters: { "method.request.path.portfolioDraftId": true },
    });
    table.grantReadWriteData(createPortfolioStepFn);

    /**
     * Simple Method attaching the validator.
     
    const postMethod = restApi.root.addMethod("POST", new apigw.MockIntegration(), {
      requestValidator: myValidator,
    }); */
  }
}
/*

    const portfolioDrafts = restApi.root.addResource("portfolioDrafts");
    const portfolioDraftId = portfolioDrafts.addResource("{portfolioDraftId}");
    const portfolio = portfolioDraftId.addResource("portfolio");
    const funding = portfolioDraftId.addResource("funding");
    // OperationIds from API spec are used to identify functions below

    const createPortfolioDraft = new ApiDynamoDBFunction(this, "CreatePortfolioDraft", {
      resource: portfolioDrafts,
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/createPortfolioDraft.ts",
    });

    const getPortfolioDrafts = new ApiDynamoDBFunction(this, "GetPortfolioDrafts", {
      resource: portfolioDrafts,
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/getPortfolioDrafts.ts",
    });

    const deletePortfolioDraft = new ApiDynamoDBFunction(this, "DeletePortfolioDraft", {
      resource: portfolioDraftId,
      table: table,
      method: HttpMethod.DELETE,
      handlerPath: packageRoot() + "/api/portfolioDrafts/deletePortfolioDraft.ts",
    });

    const createPortfolioStep = new ApiDynamoDBFunction(this, "CreatePortfolioStep", {
      resource: portfolio,
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/portfolio/createPortfolioStep.ts",
    });

    const getPortfolioStep = new ApiDynamoDBFunction(this, "GetPortfolioStep", {
      resource: portfolio,
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/portfolio/getPortfolioStep.ts",
    });

    const createFundingStep = new ApiDynamoDBFunction(this, "CreateFundingStep", {
      resource: funding,
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/funding/createFundingStep.ts",
    });

    const getFundingStep = new ApiDynamoDBFunction(this, "GetFundingStep", {
      resource: funding,
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/funding/getFundingStep.ts",
    });

    // TODO: getPortfolioDraft
    // TODO: getApplicationStep
    // TODO: createApplicationStep
    // TODO: submitPortfolioDraft
    addTaskOrderRoutes(this, restApi);
  }
}

function addTaskOrderRoutes(scope: cdk.Stack, restApi: apigw.RestApi) {
  const taskOrderFiles = restApi.root.addResource("taskOrderFiles");
  const taskOrderId = taskOrderFiles.addResource("{taskOrderId}");
  const taskOrderManagement = new TaskOrderLifecycle(scope, "TaskOrders");
  const createTaskOrderFile = new ApiS3Function(scope, "CreateTaskOrderFile", {
    resource: taskOrderFiles,
    bucket: taskOrderManagement.pendingBucket,
    method: HttpMethod.POST,
    handlerPath: packageRoot() + "/api/taskOrderFiles/createTaskOrderFile.ts",
    functionPropsOverride: {
      memorySize: 256,
    },
  });
  const deleteTaskOrderFile = new ApiS3Function(scope, "DeleteTaskOrderFile", {
    resource: taskOrderId,
    bucket: taskOrderManagement.acceptedBucket,
    method: HttpMethod.DELETE,
    handlerPath: packageRoot() + "/api/taskOrderFiles/deleteTaskOrderFile.ts",
  });

  // TODO: getTaskOrderFiles
}
*/
