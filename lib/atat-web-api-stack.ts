import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as statement from "cdk-iam-floyd";
import { Construct } from "constructs";
import { AtatNetStack } from "./atat-net-stack";
import { AtatRestApi, AtatRestApiProps } from "./constructs/apigateway";
import { UserPermissionBoundary } from "./aspects/user-only-permission-boundary";
import { ApiSfnFunction } from "./constructs/api-sfn-function";
import { HttpMethod } from "./http";
import { ProvisioningWorkflow } from "./constructs/provisioning-sfn-workflow";
import { ApiUser } from "./constructs/api-user";

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
    api.grantOnRoute(readUser.user, "GET");
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
              new statement.ExecuteApi().allow().toInvoke().on(api.restApi.arnForExecuteApi()),
              // This may seem a little redundant; however, implicit denies
              // in permissions boundaries do not limit resource-based policies.
              // So we need an _explicit_ deny for any action other than
              // `execute-api:*` so that one of the users cannot mistakenly be
              // given an identity-based policy that grants something like
              // s3:GetObject on * while an S3 bucket allows the user to read
              // from that bucket.
              new statement.ExecuteApi()
                .deny()
                .notActions()
                .toInvoke()
                .notResources()
                .on(api.restApi.arnForExecuteApi()),
            ],
          }),
        })
      )
    );

    // State Machine and workflow
    const provisioningSfn = new ProvisioningWorkflow(this, "ProvisioningWorkflow", { environmentName });

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
  }
}
