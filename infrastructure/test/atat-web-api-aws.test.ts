import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import { IVpc } from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import * as AtatWebApi from "../lib/atat-web-api-stack";

test("DynamoDB Resource is present, and Partition Key is set.", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new AtatWebApi.AtatWebApiStack(app, "MyTestStack", {
    environmentId: "testrunner",
    idpProps: {
      secretName: "/test/secret",
      providerName: "TestIdp",
    },
    smtpProps: {
      secretName: "/test/smtp",
    },
    vpc: undefined as unknown as IVpc,
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
