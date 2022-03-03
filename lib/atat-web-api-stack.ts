import { Stack, StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { AtatRestApi } from "./constructs/apigateway";

export class AtatWebApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const apigw = new AtatRestApi(this, "SampleApi");
    apigw.restApi.root.addMethod("ANY");

    // Ensure that no IAM users in this Stack can ever do anything
    // except for invoke the created API Gateway. iam.PermissionsBoundary
    // will apply an Aspect to this entire scope.
    // This defines the *maximum* set of permissions any user can ever
    // have and (as a permissions boundary) does not directly grant any
    // permissions.
    iam.PermissionsBoundary.of(this).apply(
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
    );
  }
}
