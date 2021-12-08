import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as AtatWebApi from "../lib/atat-web-api-stack";
import * as AtatNetStack from "../lib/atat-net-stack";

test("DynamoDB Resource is present, and Partition Key is set.", () => {
  const app = new cdk.App();
  const vpcStack = new AtatNetStack.AtatNetStack(app, "TestNetStack", {});
  // WHEN
  const stack = new AtatWebApi.AtatWebApiStack(app, "MyTestStack", {
    environmentId: "testrunner",
    idpProps: [
      {
        secretName: "/test/secret",
        providerName: "TestIdp",
      },
    ],
    smtpProps: {
      secretName: "/test/smtp",
    },
    vpc: vpcStack.vpc,
  });
  // THEN
  expectCDK(stack).to(
    haveResource("AWS::DynamoDB::Table", {
      KeySchema: [
        {
          AttributeName: "id",
          KeyType: "HASH",
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: "id",
          AttributeType: "S",
        },
      ],
    })
  );
});
