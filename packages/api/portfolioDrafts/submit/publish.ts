import { UpdateCommand, UpdateCommandOutput, GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiSuccessResponse, NoContentResponse, SuccessStatusCode } from "../../utils/response";
import { isBodyPresent, isPathParameterPresent } from "../../utils/validation";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  REQUEST_BODY_NOT_EMPTY,
  PORTFOLIO_ALREADY_SUBMITTED,
  PATH_PARAMETER_REQUIRED_BUT_MISSING,
} from "../../utils/errors";
import { PortfolioDraft } from "../../models/PortfolioDraft";
import { v4 as uuidv4 } from "uuid";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "../../utils/sqs";
// const TABLE_NAME = process.env.ATAT_TABLE_NAME ?? "";
const QUEUE_URL = process.env.ATAT_QUEUE_URL ?? "";

/**
 * Submits all progress from the Portfolio Provisioning Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Set the parameters
  const params = {
    MessageBody: "Hello World",
    MessageDeduplicationId: "TheWhistler", // Required for FIFO queues
    MessageGroupId: "Group1", // Required for FIFO queues
    QueueUrl: QUEUE_URL, // SQS_QUEUE_URL; e.g., 'https://sqs.REGION.amazonaws.com/ACCOUNT-ID/QUEUE-NAME'
  };

  try {
    // const result = await submitPortfolioDraftCommand(TABLE_NAME, portfolioDraftId);
    const data = await sqsClient.send(new SendMessageCommand(params));
    console.log("Success, message sent. MessageID:", data.MessageId);
    return new NoContentResponse();
  } catch (error) {
    console.log("Error", error);
    return PORTFOLIO_ALREADY_SUBMITTED;
  }
}
