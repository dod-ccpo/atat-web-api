import jwtDecode, { JwtDecodeOptions, JwtHeader, JwtPayload } from "jwt-decode";
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
  try {
    validateToken(event.authorizationToken);
  } catch (e) {
    console.warn("Token failed validation: " + e);
    // Return 401 Unauthorized
    effect = PolicyEffect.DENY;
  }
  effect = PolicyEffect.ALLOW;

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

/**
 * Validates given JWT.  Throws error if invalid.
 *
 * Authorizing API requests
 * - Check the identitySource for a token. The identitySource can include only the token, or the token prefixed with Bearer.
 * - Decode the token.
 * - Check the token's algorithm and signature by using the public key that is fetched from the issuer's jwks_uri.
 *   https://cognito-idp.us-gov-west-1.amazonaws.com/us-gov-west-1_aOkFERvad/.well-known/jwks.json
 * - Validate claims. API Gateway evaluates the following token claims:
 *   - kid – The token must have a header claim that matches the key in the jwks_uri that signed the token.
 *   - iss – Must match the issuer that is configured for the authorizer.
 *   - aud or client_id – Must match one of the audience entries that is configured for the authorizer.
 *   - exp – Must be after the current time in UTC.
 *   - nbf – Must be before the current time in UTC.
 *   - iat – Must be before the current time in UTC.
 *   - scope or scp – The token must include at least one of the scopes in the route's authorizationScopes.
 *
 * If any of these steps fail, deny the API request.
 */
export function validateToken(token: string): void {
  // JwtHeader has 'type' not 'typ'
  interface MyJwtHeader extends JwtHeader {
    typ: string;
  }
  const options: JwtDecodeOptions = { header: true };
  const tokenHeader = jwtDecode<MyJwtHeader>(token, options);
  if (tokenHeader.typ !== "JWT") {
    throw Error("Unexpected type");
  }
  if (tokenHeader.alg !== "RS256") {
    throw Error("Unexpected algorithm");
  }
  const tokenPayload = jwtDecode<JwtPayload>(token);
  // TODO: check signature
  // TODO: check all claims
}
