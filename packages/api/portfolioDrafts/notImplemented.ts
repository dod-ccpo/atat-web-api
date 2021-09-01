import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NOT_IMPLEMENTED } from "../utils/errors";

/**
 * Returns "Not Implemented", used as a placeholder in the atat_provisioning_wizard_api.yaml
 *
 * @param event - The GET request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return NOT_IMPLEMENTED;
}
