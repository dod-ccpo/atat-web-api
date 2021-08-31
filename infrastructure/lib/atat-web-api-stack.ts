import * as apigw from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as s3asset from "@aws-cdk/aws-s3-assets";
import * as cdk from "@aws-cdk/core";
import { ApiDynamoDBFunction } from "./constructs/api-dynamodb-function";
import { HttpMethod } from "./http";
import { ApiS3Function } from "./constructs/api-s3-function";
import { TaskOrderLifecycle } from "./constructs/task-order-lifecycle";

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

    const createPortfolioStep = new ApiDynamoDBFunction(this, "CreatePortfolioStepFunction", {
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/portfolio/createPortfolioStep.ts",
    });

    const createPortfolioDraft = new ApiDynamoDBFunction(this, "CreatePortfolioDraftFunction", {
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/createPortfolioDraft.ts",
    });

    const getPortfolioDrafts = new ApiDynamoDBFunction(this, "GetPortfolioDraftsFunction", {
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/getPortfolioDrafts.ts",
    });

    const deletePortfolioDraft = new ApiDynamoDBFunction(this, "DeletePortfolioDraftFunction", {
      table: table,
      method: HttpMethod.DELETE,
      handlerPath: packageRoot() + "/api/portfolioDrafts/deletePortfolioDraft.ts",
    });

    const getPortfolioStep = new ApiDynamoDBFunction(this, "GetPortfolioStepFunction", {
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/portfolio/getPortfolioStep.ts",
    });

    const createFundingStep = new ApiDynamoDBFunction(this, "CreateFundingStepFunction", {
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/funding/createFundingStep.ts",
    });

    const getFundingStep = new ApiDynamoDBFunction(this, "GetFundingStepFunction", {
      table: table,
      method: HttpMethod.GET,
      handlerPath: packageRoot() + "/api/portfolioDrafts/funding/getFundingStep.ts",
    });

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
    // TODO: getPortfolioDraft
    // TODO: getApplicationStep
    // TODO: createApplicationStep
    // TODO: submitPortfolioDraft
    addTaskOrderRoutes(this);
  }
}
function addTaskOrderRoutes(scope: cdk.Stack) {
  const taskOrderManagement = new TaskOrderLifecycle(scope, "TaskOrders");
  const uploadTaskOrder = new ApiS3Function(scope, "UploadTaskOrderFunction", {
    bucket: taskOrderManagement.pendingBucket,
    method: HttpMethod.POST,
    handlerPath: packageRoot() + "/api/taskOrderFiles/uploadTaskOrder.ts",
    functionPropsOverride: {
      memorySize: 256,
    },
  });
  const deleteTaskOrder = new ApiS3Function(scope, "DeleteTaskOrderFunction", {
    bucket: taskOrderManagement.acceptedBucket,
    method: HttpMethod.DELETE,
    handlerPath: packageRoot() + "/api/taskOrderFiles/deleteTaskOrder.ts",
  });

  // TODO: getTaskOrder (for metadata)
  // TODO: downloadTaskOrder
}
