import * as apigw from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as s3asset from "@aws-cdk/aws-s3-assets";
import * as cdk from "@aws-cdk/core";
import { ApiDynamoDBFunction } from "./constructs/api-dynamodb-function";
import { ApiS3Function } from "./constructs/api-s3-function";
import { TaskOrderLifecycle } from "./constructs/task-order-lifecycle";
import { HttpMethod } from "./http";
import { packageRoot } from "./util";

export interface AtatWebApiStackProps extends cdk.StackProps {
  removalPolicy?: cdk.RemovalPolicy;
}

export class AtatWebApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: AtatWebApiStackProps) {
    super(scope, id, props);

    this.templateOptions.description = "Resources to support the ATAT application API";

    // Create a shared DynamoDB table that will be used by all the functions in the project.
    const table = new dynamodb.Table(this, "AtatTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: props?.removalPolicy,
    });
    const tableOutput = new cdk.CfnOutput(this, "TableName", {
      value: table.tableName,
    });

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

    const submitPortfolioDraft = new ApiDynamoDBFunction(this, "SubmitPortfolioDraft", {
      table: table,
      method: HttpMethod.POST,
      handlerPath: packageRoot() + "/api/portfolioDrafts/submit/submitPortfolioDraft.ts",
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
    const restApi = new apigw.SpecRestApi(this, "AtatSpecTest", {
      apiDefinition: apigw.ApiDefinition.fromInline(apiSpecAsTemplateInclude),
      // This is slightly repetitive between endpointTypes and parameters.endpointConfigurationTypes; however, due
      // to underlying CloudFormation behaviors, endpointTypes is not evaluated entirely correctly when a
      // parameter specification is given. Specifying both ensures that we truly have a regional endpoint rather than
      // edge.
      endpointTypes: [apigw.EndpointType.REGIONAL],
      parameters: {
        endpointConfigurationTypes: apigw.EndpointType.REGIONAL,
      },
    });
    // TODO: getPortfolioDraft
    // TODO: getApplicationStep
    // TODO: createApplicationStep
    // TODO: submitPortfolioDraft
    this.addTaskOrderRoutes(props);
  }

  private addTaskOrderRoutes(props?: AtatWebApiStackProps) {
    const taskOrderManagement = new TaskOrderLifecycle(this, "TaskOrders", {
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

    // TODO: getTaskOrder (for metadata)
    // TODO: downloadTaskOrder
  }
}
