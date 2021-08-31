import * as apigw from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";
import * as s3asset from "@aws-cdk/aws-s3-assets";
import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import { ApiDynamoDBFunction } from "./constructs/api-dynamodb-function";
import { HttpMethod } from "./http";

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

    // Creates a shared API Gateway that all the functions will be able to add routes to.
    // Ideally we'd define different stages for dev, test, and staging. For now, a single
    // stage for everything being dev is good enough for a proof of concept

    /**
     * A Validator
     */
    /*
    const sharedFunctionProps: lambdaNodejs.NodejsFunctionProps = {
      environment: {
        ATAT_TABLE_NAME: table.tableName,
      },
      bundling: {
        externalModules: ["aws-sdk"],
      },
    }; */
    /*
    createPortfolioDraft = new ApiDynamoDBFunction(this, "CreatePortfolioDraft", {
      resource: portfolioDrafts,
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/createPortfolioDraft.ts",
    }); */
    /*
    const createPortfolioDraftFn = new ApiDynamoDBFunction(this, "CreatePortfolioDraftFunction", {
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/createPortfolioDraft.ts",
    });
*/
    /*
    const createPortfolioDraftFn = new lambdaNodejs.NodejsFunction(this, "CreatePortfolioDraftFunction", {
      entry: packageRoot() + "/api/portfolioDrafts/createPortfolioDraft.ts",
      ...sharedFunctionProps,
    }); */
    /*
    portfolioDrafts.addMethod("POST", new apigw.LambdaIntegration(createPortfolioDraftFn));
    */
    /*
    table.grantReadWriteData(createPortfolioDraftFn);
*/
    // createPortfolioStep
    // Create the Function resource with the CDK magic for packaging and bundling a NodeJS package.
    // TODO: Rework the ApiFunction construct and subclass(es) to take the entry, desired LogicalId, and the
    // type of access that should be granted to DynamoDB/S3. Most of the other code there can actually be
    // removed.
    // START: Things Done For Every Function
    /*
    const createPortfolioStepFn = new lambdaNodejs.NodejsFunction(this, "CreatePortfolioStepFunction", {
      entry: packageRoot() + "/api/portfolioDrafts/portfolio/createPortfolioStep.ts",
      ...sharedFunctionProps,
    });
    table.grantReadWriteData(createPortfolioStepFn); */
    const createPortfolioStep = new ApiDynamoDBFunction(this, "CreatePortfolioStepFunction", {
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/portfolio/createPortfolioStep.ts",
    });
    // We need to override the Logical ID so that we have a meaningful way to reference the resource to get
    // it's ARN when we load it in from the API spec.
    createPortfolioStep.logicalL1.overrideLogicalId("CreatePortfolioStepFunction");

    // const createPortfolioStepLogicalL1 = createPortfolioStep.node.defaultChild as lambda.CfnFunction;
    // createPortfolioStepLogicalL1.overrideLogicalId("CreatePortfolioStepFunction");
    // const createPortfolioDraftLogicalL1 = createPortfolioDraftFn.node.defaultChild as lambda.CfnFunction;
    // createPortfolioDraftLogicalL1.overrideLogicalId("CreatePortfolioDraftFunction");

    // END: Things Done For Every Function
    // Everything after this point is only necessary to do once.

    // The API spec, which just so happens to be a valid CloudFormation snippet (with some actual CloudFormation
    // in it) gets uploaded to S3
    const apiAsset = new s3asset.Asset(this, "ApiSpecAsset", {
      path: "./atat_provisioning_wizard_api.yaml",
    });

    // And now we include that snippet as an actual part of the template using the AWS::Include Transform. This
    // is where the two previous pieces come together. Now, all the Fn::Sub and other functions will be resolved
    // which means that we can reference the ARNs of the various functions.
    const data = cdk.Fn.transform("AWS::Include", { Location: apiAsset.s3ObjectUrl });

    // And with the data now loaded from the template, we can use ApiDefinition.fromInline to parse it as real
    // OpenAPI spec (because it was!) and now we've got all our special AWS values and variables interpolated.
    const restApi = new apigw.SpecRestApi(this, "AtatSpecTest", {
      apiDefinition: apigw.ApiDefinition.fromInline(data),
      endpointTypes: [apigw.EndpointType.REGIONAL],
      parameters: {
        endpointConfigurationTypes: apigw.EndpointType.REGIONAL,
      },
    });
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
