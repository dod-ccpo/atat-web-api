import * as apigw from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as cdk from "@aws-cdk/core";
import { ApiDynamoDBFunction } from "./constructs/api-dynamodb-function";
import { ApiS3Function } from "./constructs/api-s3-function";
import { TaskOrderLifecycle } from "./constructs/task-order-lifecycle";
import { HttpMethod } from "./http";
import { packageRoot } from "./util";

export class AtatWebApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.templateOptions.description = "Resources to support the ATAT application API";

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

    // Creates a shared API Gateway that all the functions will be able to add routes to.
    // Ideally we'd define different stages for dev, test, and staging. For now, a single
    // stage for everything being dev is good enough for a proof of concept
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

    const portfolioDrafts = restApi.root.addResource("portfolioDrafts");
    const portfolioDraftId = portfolioDrafts.addResource("{portfolioDraftId}");
    const portfolio = portfolioDraftId.addResource("portfolio");
    const funding = portfolioDraftId.addResource("funding");
    const application = portfolioDraftId.addResource("application");
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

    const createApplicationStep = new ApiDynamoDBFunction(this, "CreateApplicationStep", {
      resource: application,
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/application/createApplicationStep.ts",
    });

    const getApplicationStep = new ApiDynamoDBFunction(this, "GetApplicationStep", {
      resource: application,
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/application/getApplicationStep.ts",
    });

    const getPortfolioDraft = new ApiDynamoDBFunction(this, "GetPortfolioDraft", {
      resource: portfolioDraftId,
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/getPortfolioDraft.ts",
    });

    // TODO: submitPortfolioDraft
    addTaskOrderRoutes(this, restApi);
  }
}

function addTaskOrderRoutes(scope: cdk.Stack, restApi: apigw.RestApi) {
  const taskOrderFiles = restApi.root.addResource("taskOrderFiles");
  const taskOrderId = taskOrderFiles.addResource("{taskOrderId}");
  const taskOrderManagement = new TaskOrderLifecycle(scope, "TaskOrders");
  // OperationIds from API spec are used to identify functions below

  const uploadTaskOrder = new ApiS3Function(scope, "UploadTaskOrder", {
    resource: taskOrderFiles,
    bucket: taskOrderManagement.pendingBucket,
    method: HttpMethod.POST,
    handlerPath: packageRoot() + "/api/taskOrderFiles/uploadTaskOrder.ts",
    functionPropsOverride: {
      memorySize: 256,
    },
  });
  const deleteTaskOrder = new ApiS3Function(scope, "DeleteTaskOrder", {
    resource: taskOrderId,
    bucket: taskOrderManagement.acceptedBucket,
    method: HttpMethod.DELETE,
    handlerPath: packageRoot() + "/api/taskOrderFiles/deleteTaskOrder.ts",
  });

  // TODO: getTaskOrder (for metadata)
  // TODO: downloadTaskOrder
}
