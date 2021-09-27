import {
  APIGatewayAuthorizerResult,
  APIGatewayAuthorizerResultContext,
  APIGatewayTokenAuthorizerEvent,
  PolicyDocument,
} from "aws-lambda";

export enum PolicyEffect {
  ALLOW = "Allow",
  DENY = "Deny",
}
/**
 * Reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-input.html
 * @param event an authorizer event that contains, among other things, a caller-supplied-token in property 'authorizationToken'
 * @param context the context
 * @returns a resource-based JSON policy document either allowing or denying the principal to invoke a specific resource
 */
export async function handler(
  event: APIGatewayTokenAuthorizerEvent,
  context: APIGatewayAuthorizerResultContext
): Promise<APIGatewayAuthorizerResult> {
  let effect: PolicyEffect;
  switch (event.authorizationToken.toLowerCase()) {
    case "allow":
      effect = PolicyEffect.ALLOW;
      break;
    case "deny":
    case "unauthorized":
    default:
      // Return 401 Unauthorized
      effect = PolicyEffect.DENY;
  }
  return {
    principalId: "janemanager",
    policyDocument: generatePolicyDocument(effect, event.methodArn),
  };
}

/**
 * Generates JSON policy documents which are resource-based policies attached to a resource.
 * Reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html#policies_resource-based
 * @param effect either 'Allow' or 'Deny'
 * @param resourceArn the ARN of a specific resource
 * @returns a JSON policy document either allowing or denying the invokation of the specified resource
 */
export function generatePolicyDocument(effect: PolicyEffect, resourceArn: string): PolicyDocument {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: effect,
        Resource: resourceArn,
      },
    ],
  };
}
