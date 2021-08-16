import * as apigw from "@aws-cdk/aws-apigateway";
import { UserPool } from "@aws-cdk/aws-cognito";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";

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

    const sharedFunctionProps: lambdaNodejs.NodejsFunctionProps = {
      environment: {
        ATAT_TABLE_NAME: table.tableName,
      },
      bundling: {
        externalModules: ["aws-sdk"],
      },
    };

    // NEW FUNCTIONS GET DEFINED HERE
    // Some notes:
    //   - Each function gets defined using `lambdaNodejs.NodejsFunction` for now. You can probably
    //     reuse the `sharedFunctionProps`, especially for the early functions
    //   - Define new portfolioDrafts routes as `portfolioDrafts.addResource`
    //   - You can define routes with variables/path parameters by using the typical brace notation
    //     for example .addResource("{portfolioDraft}")
    //   - Make sure to call `table.grantReadData` or `table.grantReadWriteData` as appropriate (so for GETs
    //     try to only grant read)
    // We definitely want to improve the ergonomics of this and doing so is a high priority; however, following
    // these examples and steps should be a good start to allow progress while that work is happening.
    const portfolioDrafts = restApi.root.addResource("portfolioDrafts");
    const portfolioDraftId = portfolioDrafts.addResource("{portfolioDraftId}");
    const portfolio = portfolioDraftId.addResource("portfolio");
    const funding = portfolioDraftId.addResource("funding");

    // OperationIds from API spec are used to identify functions below

    // createPortfolioDraft
    const createPortfolioDraftFn = new lambdaNodejs.NodejsFunction(this, "CreatePortfolioDraftFunction", {
      entry: packageRoot() + "/api/portfolioDrafts/createPortfolioDraft.ts",
      ...sharedFunctionProps,
    });
    portfolioDrafts.addMethod("POST", new apigw.LambdaIntegration(createPortfolioDraftFn));
    table.grantReadWriteData(createPortfolioDraftFn);

    // deletePortfolioDraft
    const deletePortfolioDraftFn = new lambdaNodejs.NodejsFunction(this, "DeletePortfolioDraftFunction", {
      entry: packageRoot() + "/api/portfolioDrafts/deletePortfolioDraft.ts",
      ...sharedFunctionProps,
    });
    portfolioDraftId.addMethod("DELETE", new apigw.LambdaIntegration(deletePortfolioDraftFn));
    table.grantReadWriteData(deletePortfolioDraftFn);

    // createPortfolioStep
    const createPortfolioStepFn = new lambdaNodejs.NodejsFunction(this, "CreatePortfolioStepFunction", {
      entry: packageRoot() + "/api/portfolioDrafts/portfolio/createPortfolioStep.ts",
      ...sharedFunctionProps,
    });
    portfolio.addMethod("POST", new apigw.LambdaIntegration(createPortfolioStepFn));
    table.grantReadWriteData(createPortfolioStepFn);

    // getPortfolioStep
    const getPortfolioStepFn = new lambdaNodejs.NodejsFunction(this, "GetPortfolioStepFunction", {
      entry: packageRoot() + "/api/portfolioDrafts/portfolio/getPortfolioStep.ts",
      ...sharedFunctionProps,
    });
    portfolio.addMethod("GET", new apigw.LambdaIntegration(getPortfolioStepFn));
    table.grantReadData(getPortfolioStepFn);

    // getPortfolioDrafts
    const getPortfolioDraftsFn = new lambdaNodejs.NodejsFunction(this, "GetPortfolioDraftsFunction", {
      entry: packageRoot() + "/api/portfolioDrafts/getPortfolioDrafts.ts",
      ...sharedFunctionProps,
    });
    portfolioDrafts.addMethod("GET", new apigw.LambdaIntegration(getPortfolioDraftsFn));
    table.grantReadData(getPortfolioDraftsFn);

    // createFundingStep
    const createFundingStepFn = new lambdaNodejs.NodejsFunction(this, "CreateFundingStepFunction", {
      entry: packageRoot() + "/api/portfolioDrafts/funding/createFundingStep.ts",
      ...sharedFunctionProps,
    });
    funding.addMethod("POST", new apigw.LambdaIntegration(createFundingStepFn));
    table.grantReadWriteData(createFundingStepFn);

    // TODO: getPortfolioDraft
    // TODO: getFundingStep
    // TODO: getApplicationStep
    // TODO: createApplicationStep
    // TODO: submitPortfolioDraft
    // TODO: uploadTaskOrder
    // TODO: deleteTaskOrder
  }
}
