import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as AtatWebApi from "../lib/atat-web-api-stack";

test("DynamoDB Resource is present, and Partition Key is set.", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new AtatWebApi.AtatWebApiStack(app, "MyTestStack");
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
