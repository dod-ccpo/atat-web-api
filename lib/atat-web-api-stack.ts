import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { AtatNetStack } from "./atat-net-stack";
import { AtatRestApi, AtatRestApiProps } from "./constructs/apigateway";
import { UserPermissionBoundary } from "./aspects/user-only-permission-boundary";
import { ApiSfnFunction } from "./constructs/api-sfn-function";
import { HttpMethod } from "./http";
import { ProvisioningWorkflow } from "./constructs/provisioning-sfn-workflow";
import { ApiUser } from "./constructs/api-user";
import * as idp from "./constructs/identity-provider";
import { CostApiImplementation } from "./constructs/cost-api-implementation";

export interface AtatWebApiStackProps extends cdk.StackProps {
  environmentName: string;
  network?: AtatNetStack;
}

export class AtatWebApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtatWebApiStackProps) {
    super(scope, id, props);
    const { environmentName, network } = props;

    const apiProps: AtatRestApiProps = {
      restApiName: `${environmentName}HothApi`,
      binaryMediaTypes: ["application/json", "application/pdf"],
    };
    if (network) {
      apiProps.vpcConfig = {
        vpc: network.vpc,
        interfaceEndpoint: network.endpoints.apigateway,
        tempDontUseVpcEndpoint: true,
      };
    }

    const api = new AtatRestApi(this, "HothApi", apiProps);
    const readUser = new ApiUser(this, "ReadUser", { secretPrefix: "api/user/snow", username: "ReadUser" });
    const writeUser = new ApiUser(this, "WriteUser", { secretPrefix: "api/user/snow", username: "WriteUser" });
    api.grantOnRoute(readUser.user, HttpMethod.GET);
    api.grantOnRoute(writeUser.user, "*");

    // Ensure that no IAM users in this Stack can ever do anything
    // except for invoke the created API Gateway.
    // This defines the *maximum* set of permissions any user can ever
    // have and (as a permissions boundary) does not directly grant any
    // permissions.
    cdk.Aspects.of(this).add(
      new UserPermissionBoundary(
        new iam.ManagedPolicy(this, "ApiUserBoundary", {
          document: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["execute-api:Invoke"],
                resources: [api.restApi.arnForExecuteApi()],
              }),
              // This may seem a little redundant; however, implicit denies
              // in permissions boundaries do not limit resource-based policies.
              // So we need an _explicit_ deny for any action other than
              // `execute-api:*` so that one of the users cannot mistakenly be
              // given an identity-based policy that grants something like
              // s3:GetObject on * while an S3 bucket allows the user to read
              // from that bucket.
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                notActions: ["execute-api:Invoke"],
                notResources: [api.restApi.arnForExecuteApi()],
              }),
            ],
          }),
        })
      )
    );

    const atatIdp = new idp.CognitoIdentityProvider(this, "AtatIdp", {
      domainPrefix: `atat${environmentName.toLowerCase()}`,
      scopeConfig: [
        {
          resourceServerName: "atat",
          scopes: [
            { name: "read-cost", description: "Allow reading cost information" },
            { name: "read-portfolio", description: "Allow reading information about portfolios" },
            { name: "write-portfolio", description: "Allow creating and updating portfolios" },
          ],
        },
      ],
    });
    const urlOutput = new cdk.CfnOutput(this, "IdpDiscoveryUrl", {
      value: atatIdp.discoveryUrl(),
    });

    // State Machine and workflow
    const provisioningSfn = new ProvisioningWorkflow(this, "ProvisioningWorkflow", { environmentName, idp: atatIdp });

    // Provisioning lambda that translates and invokes the state machine
    const provisioningJob = new ApiSfnFunction(this, "ProvisioningJobRequest", {
      method: HttpMethod.POST,
      handlerPath: "api/provision/start-provisioning-job.ts",
      stateMachine: provisioningSfn.stateMachine,
    });

    // APIGW Provisioning Job Resource
    const provisioningJobResource = api.restApi.root.addResource("provisioning-jobs");
    provisioningJobResource.addMethod(provisioningJob.method, new apigw.LambdaIntegration(provisioningJob.fn));
    provisioningJobResource.addMethod(
      provisioningSfn.provisioningQueueConsumer.method,
      new apigw.LambdaIntegration(provisioningSfn.provisioningQueueConsumer.fn)
    );

    // APIGW Document Generation Resource
    const generateDocumentResource = api.restApi.root.addResource("generate-document");
    const documentGenerationLayer = new lambda.LayerVersion(this, "GenerateDocumentSupportLayer", {
      compatibleRuntimes: [lambda.Runtime.NODEJS_16_X],
      code: lambda.Code.fromAsset("document-generation/templates", {}),
    });
    const generateDocumentFn = new nodejs.NodejsFunction(this, "GenerateDocumentFunction", {
      entry: "document-generation/generate-document.ts",
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: 512,
      bundling: {
        nodeModules: ["@sparticuz/chrome-aws-lambda", "puppeteer-core"],
      },
      layers: [documentGenerationLayer],
      timeout: cdk.Duration.seconds(60),
    });
    generateDocumentResource.addMethod(HttpMethod.POST, new apigw.LambdaIntegration(generateDocumentFn));

    // Build all Cost Resources
    const costApi = new CostApiImplementation(this, {
      environmentName,
      apiParent: api.restApi.root,
      vpc: props?.network?.vpc,
    });
  }
}
