import { APIGatewayAuthorizerResultContext, APIGatewayTokenAuthorizerEvent } from "aws-lambda";
import { generatePolicyDocument, handler, PolicyEffect, validateToken } from "./authorizer";

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

describe("validateToken()", function () {
  // JWT = <header>.<payload>.<signature>
  // These sections are encoded as base64url strings and are separated by dot (.) characters.
  // If your JWT does not conform to this structure, consider it invalid and do not accept it.
  const token =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJSUzI1NmluT1RBIiwibmFtZSI6IkpvaG4gRG9lIn0.ICV6gy7CDKPHMGJxV80nDZ7Vxe0ciqyzXD_Hr4mTDrdTyi6fNleYAyhEZq2J29HSI5bhWnJyOBzg2bssBUKMYlC2Sr8WFUas5MAKIr2Uh_tZHDsrCxggQuaHpF4aGCFZ1Qc0rrDXvKLuk1Kzrfw1bQbqH6xTmg2kWQuSGuTlbTbDhyhRfu1WDs-Ju9XnZV-FBRgHJDdTARq1b4kuONgBP430wJmJ6s9yl3POkHIdgV-Bwlo6aZluophoo5XWPEHQIpCCgDm3-kTN_uIZMOHs2KRdb6Px-VN19A5BYDXlUBFOo-GvkCBZCgmGGTlHF_cWlDnoA9XTWWcIYNyUI4PXNw";
  it("should not throw error when given valid token", () => {
    expect(() => validateToken(token)).not.toThrow();
  });
  it("should throw error when given invalid token", () => {
    expect(() => validateToken("")).toThrow();
  });
  it("should throw error when given invalid token", () => {
    expect(() => validateToken("{}")).toThrow();
  });
  it("should throw error when given invalid token", () => {
    expect(() => validateToken("foobar")).toThrow();
  });
  it("should throw error when given invalid token", () => {
    expect(() => validateToken("<header>.<payload>.<signature>")).toThrow();
  });
  it("should throw error when given invalid token", () => {
    const str = "987oi8eyroueyouukyk";
    expect(() => validateToken(str + "." + str + "." + str)).toThrow();
  });
  it.todo("should throw error when given token with unexpected type");
  it.todo("should throw error when given token with unexpected algorithm");
  it.todo("should throw error when given token with invalid signature");
  it.todo("should throw error when given token has key id (kid) other than the one that signed the token");
  it.todo("should throw error when given token has issuer (iss) other than the one configured for the authorizer");
  it.todo("aud or client_id – Must match one of the audience entries that is configured for the authorizer.");
  it.todo("exp – Must be after the current time in UTC.");
  it.todo("nbf – Must be before the current time in UTC.");
  it.todo("iat – Must be before the current time in UTC.");
  it.todo("iat – Must be before the current time in UTC.");
  it.todo("scope or scp – The token must include at least one of the scopes in the route's authorizationScopes.");
});
