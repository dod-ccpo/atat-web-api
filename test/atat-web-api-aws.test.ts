import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as AtatWebApiAws from "../lib/atat-web-api-aws-stack";

test("DynamoDB Resource is present, and Partition Key is set.", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new AtatWebApiAws.AtatWebApiAwsStack(app, "MyTestStack");
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

test("API Gateway V2 Resource is present, QuotesAPI AllowedMethods defined.", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new AtatWebApiAws.AtatWebApiAwsStack(app, "MyTestStack");
  // THEN
  expectCDK(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      CorsConfiguration: {
        AllowCredentials: false,
        AllowHeaders: ["*"],
        AllowMethods: ["GET", "POST"],
        AllowOrigins: ["*"],
        ExposeHeaders: ["*"],
      },
      Name: "QuotesApi",
      ProtocolType: "HTTP",
    })
  );
});

test("UserPoolAuthorizer exists, using JWT", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new AtatWebApiAws.AtatWebApiAwsStack(app, "MyTestStack");
  // THEN
  expectCDK(stack).to(
    haveResource("AWS::ApiGatewayV2::Authorizer", {
      AuthorizerType: "JWT",
      Name: "UserPoolAuthorizer",
      IdentitySource: ["$request.header.Authorization"],
    })
  );
});
