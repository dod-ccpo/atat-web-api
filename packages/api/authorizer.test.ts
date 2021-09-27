import { APIGatewayAuthorizerResultContext, APIGatewayTokenAuthorizerEvent } from "aws-lambda";
import { generatePolicyDocument, handler, PolicyEffect } from "./authorizer";

describe("handler()", function () {
  const event: APIGatewayTokenAuthorizerEvent = {
    type: "TOKEN",
    authorizationToken: "allow",
    methodArn: "arn:aws:execute-api:us-gov-west-1:123456789012:5046p4ua74/prod/GET/",
  };
  const context: APIGatewayAuthorizerResultContext = {};
  it("should accept a well-formed authorizer lambda event", async () => {
    expect(event).toHaveProperty("type");
    expect(event).toHaveProperty("authorizationToken");
    expect(event).toHaveProperty("methodArn");
    expect(() => {
      handler(event, context);
    }).not.toThrow(Error());
  });
  it("should return result with properties 'principalId' and 'policyDocument'", async () => {
    const result = await handler(event, context);
    expect(result).toHaveProperty("principalId");
    expect(result).toHaveProperty("policyDocument");
  });
  it("should return result with Allow effect when caller-supplied-token is 'allow'", async () => {
    const result = await handler(event, context);
    expect(result.policyDocument.Statement[0].Effect).toBe(PolicyEffect.ALLOW);
  });
  it("should return result with Deny effect when caller-supplied-token is 'deny'", async () => {
    const denyEvent: APIGatewayTokenAuthorizerEvent = {
      ...event,
      authorizationToken: "deny",
    };
    const result = await handler(denyEvent, context);
    expect(result.policyDocument.Statement[0].Effect).toBe(PolicyEffect.DENY);
  });
  it("should return result with Deny effect when caller-supplied-token is 'unauthorized'", async () => {
    const unauthorizedEvent: APIGatewayTokenAuthorizerEvent = {
      ...event,
      authorizationToken: "unauthorized",
    };
    const result = await handler(unauthorizedEvent, context);
    expect(result.policyDocument.Statement[0].Effect).toBe(PolicyEffect.DENY);
  });
  it("should return result with Deny effect when caller-supplied-token is invalid", async () => {
    const invalidTokenEvent: APIGatewayTokenAuthorizerEvent = {
      ...event,
      authorizationToken: "invalid token",
    };
    const result = await handler(invalidTokenEvent, context);
    expect(result.policyDocument.Statement[0].Effect).toBe(PolicyEffect.DENY);
  });
  it("should return result with Deny effect when caller-supplied-token is empty string", async () => {
    const emptyStringTokenEvent: APIGatewayTokenAuthorizerEvent = {
      ...event,
      authorizationToken: "",
    };
    const result = await handler(emptyStringTokenEvent, context);
    expect(result.policyDocument.Statement[0].Effect).toBe(PolicyEffect.DENY);
  });
});

describe("generatePolicyDocument()", function () {
  const resourceArn = "arn:aws:execute-api:us-gov-west-1:123456789012:5046p4ua74/prod/GET/";
  const allowDoc = generatePolicyDocument(PolicyEffect.ALLOW, resourceArn);
  it("should return policy document with a specific version", () => {
    expect(allowDoc.Version).toEqual("2012-10-17");
  });
  it("should return policy document with a statement array with a single entry", () => {
    expect(allowDoc.Statement.length).toEqual(1);
  });
  it("should return policy document w/ Effect of 'Allow' when appropriate", async () => {
    expect(allowDoc.Statement[0].Effect).toBe(PolicyEffect.ALLOW);
  });
  it("should return policy document w/ Effect of 'Deny' when appropriate", async () => {
    const denyDoc = generatePolicyDocument(PolicyEffect.DENY, resourceArn);
    expect(denyDoc.Statement[0].Effect).toBe(PolicyEffect.DENY);
  });
  // TODO: Need help with the Types here
  // it("should return policy document w/ Action allowing invokation", async () => {
  //   expect(allowDoc.Statement[0].Action).toBe("execute-api:Invoke");
  // });
  // it("should return policy document w/ Resource equal to ARN", async () => {
  //   expect(allowDoc.Statement[0].Resource).toBe(resourceArn);
  // });
});
