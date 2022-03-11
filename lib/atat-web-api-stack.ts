import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { StateMachine } from "./constructs/state-machine";
import { AtatRestApi } from "./constructs/apigateway";
import { UserPermissionBoundary } from "./aspects/user-only-permission-boundary";
import { ApiSfnFunction } from "./constructs/api-sfn-function";
import { HttpMethod } from "./http";
import { ProvisioningWorkflow } from "./constructs/provisioning-sfn-workflow";

export interface AtatWebApiStackProps extends cdk.StackProps {
  environmentName: string;
}

export class AtatWebApiStack extends cdk.Stack {
  public readonly provisioningStateMachine: sfn.IStateMachine;

  constructor(scope: Construct, id: string, props: AtatWebApiStackProps) {
    super(scope, id, props);
    const { environmentName } = props;

    const apigw = new AtatRestApi(this, "SampleApi");
    apigw.restApi.root.addMethod("ANY");

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
                resources: [apigw.restApi.arnForExecuteApi()],
              }),
              // This may seem a little redundant; however, implicit denies
              // in permissions boundaries do not limit resource-based policies.
              // So we need an _explicit_ deny for any action other than
              // `execute-api:*` so that one of the users cannot mistakenly be
              // given an identity-based policy that grants something like
              // s3:GetObject on * while an S3 bucket allows the user to read
              // from that bucket.
              new iam.PolicyStatement({
                effect: iam.Effect.DENY,
                notActions: ["execute-api:Invoke"],
                notResources: [apigw.restApi.arnForExecuteApi()],
              }),
            ],
          }),
        })
      )
    );

    // State Machine
    const provisioningSfn = new ProvisioningWorkflow(this, { environmentName });
    this.provisioningStateMachine = new StateMachine(this, "ProvisioningStateMachine", {
      stateMachineProps: {
        definition: provisioningSfn.workflow,
      },
      logGroup: provisioningSfn.logGroup,
    }).stateMachine;

    // Provisioning lambda that translate and invokes the state machine
    const provisioningJob = new ApiSfnFunction(this, "ProvisioningJobRequest", {
      method: HttpMethod.POST,
      handlerPath: "api/provision/start-provision-job.ts",
      stateMachine: this.provisioningStateMachine,
    });

    // APIGW Provisioning Job Resource
    const provisioningJobsResource = apigw.restApi.root.addResource("provisioning-job");
    provisioningJobsResource.addMethod(provisioningJob.method, new LambdaIntegration(provisioningJob.fn));
  }
}
