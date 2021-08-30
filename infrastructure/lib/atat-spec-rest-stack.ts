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
import * as lambda from "@aws-cdk/aws-lambda";
import { Liquid } from "liquidjs";
import * as fs from "fs";

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

export interface AtatSpecRestStackProps extends cdk.StackProps {
  readonly createPortfolioStepFn: lambda.IFunction;
}
export class AtatSpecRestStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: AtatSpecRestStackProps) {
    super(scope, id, props);

    // SpecRestApi example

    const engine = new Liquid();
    engine
      .renderFile("../atat-web-api/infrastructure/atat_api.yaml", {
        createPortfolioStepFnArn: props.createPortfolioStepFn.functionArn,
        // other function names to fill into api spec
      })
      .then((template) => fs.writeFileSync("template-out.test.yaml", template));
    const restApi = new apigw.SpecRestApi(this, "AtatSpecTest", {
      apiDefinition: apigw.ApiDefinition.fromAsset("template-out.test.yaml"),
      endpointTypes: [apigw.EndpointType.REGIONAL],
      parameters: {
        endpointConfigurationTypes: apigw.EndpointType.REGIONAL,
      },
    });

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
