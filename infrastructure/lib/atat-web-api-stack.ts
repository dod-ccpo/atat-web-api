import * as apigw from "@aws-cdk/aws-apigateway";
import { UserPool } from "@aws-cdk/aws-cognito";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";
import * as s3 from "@aws-cdk/aws-s3";
import * as cdk from "@aws-cdk/core";
import { Duration } from "@aws-cdk/core";
import { HttpMethod } from "./http";
import { PortfolioDraftFunction } from "./portfolio-drafts-function";

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
    // OperationIds from API spec are used to identify functions below

    const createPortfolioDraft = new PortfolioDraftFunction(this, "CreatePortfolioDraft", {
      resource: portfolioDrafts,
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/createPortfolioDraft.ts",
    });

    const getPortfolioDrafts = new PortfolioDraftFunction(this, "GetPortfolioDrafts", {
      resource: portfolioDrafts,
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/getPortfolioDrafts.ts",
    });

    const deletePortfolioDraft = new PortfolioDraftFunction(this, "DeletePortfolioDraft", {
      resource: portfolioDraftId,
      table: table,
      method: HttpMethod.DELETE,
      handlerPath: packageRoot() + "/api/portfolioDrafts/deletePortfolioDraft.ts",
    });

    const createPortfolioStep = new PortfolioDraftFunction(this, "CreatePortfolioStep", {
      resource: portfolio,
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/portfolio/createPortfolioStep.ts",
    });

    const getPortfolioStep = new PortfolioDraftFunction(this, "GetPortfolioStep", {
      resource: portfolio,
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/portfolio/getPortfolioStep.ts",
    });

    const createFundingStep = new PortfolioDraftFunction(this, "CreateFundingStep", {
      resource: funding,
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/funding/createFundingStep.ts",
    });

    const getFundingStep = new PortfolioDraftFunction(this, "GetFundingStep", {
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
  addCreateTaskOrderFiles(scope, taskOrderFiles);
  // addGetTaskOrderFiles(scope, taskOrderId);
  addDeleteTaskOrderFiles(scope, taskOrderId);
}

function addCreateTaskOrderFiles(scope: cdk.Stack, resource: apigw.Resource) {
  const bucket = new s3.Bucket(scope, "PendingBucket", {
    publicReadAccess: false,
    removalPolicy: cdk.RemovalPolicy.RETAIN,
    autoDeleteObjects: false,
  });
  const createTaskOrderFileFn = new lambdaNodejs.NodejsFunction(scope, "CreateTaskOrderFileFunction", {
    entry: packageRoot() + "/api/taskOrderFiles/createTaskOrderFile.ts",
    timeout: Duration.seconds(300),
    environment: {
      PENDING_BUCKET: bucket.bucketName,
    },
    bundling: {
      externalModules: ["aws-sdk"],
    },
    memorySize: 256,
  });
  resource.addMethod("POST", new apigw.LambdaIntegration(createTaskOrderFileFn));
  bucket.grantPut(createTaskOrderFileFn);
}

function addDeleteTaskOrderFiles(scope: cdk.Stack, resource: apigw.Resource) {
  const bucket = new s3.Bucket(scope, "AcceptedBucket", {
    publicReadAccess: false,
    removalPolicy: cdk.RemovalPolicy.RETAIN,
    autoDeleteObjects: false,
  });
  const deleteTaskOrderFileFn = new lambdaNodejs.NodejsFunction(scope, "DeleteTaskOrderFileFunction", {
    entry: packageRoot() + "/api/taskOrderFiles/deleteTaskOrderFile.ts",
    environment: {
      ACCEPTED_BUCKET: bucket.bucketName,
    },
    bundling: {
      externalModules: ["aws-sdk"],
    },
  });
  resource.addMethod("DELETE", new apigw.LambdaIntegration(deleteTaskOrderFileFn));
  bucket.grantDelete(deleteTaskOrderFileFn);
}
