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
import { SqsEventSource } from "@aws-cdk/aws-lambda-event-sources";
const TABLE_NAME = process.env.ATAT_TABLE_NAME ?? "";
const QUEUE_URL = process.env.ATAT_QUEUE_URL ?? "";

/**
 * Submits all progress from the Portfolio Provisioning Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: any) {
  event.Records.forEach((record: any) => {
    const { body } = record;
    console.log(body);
  });
}
