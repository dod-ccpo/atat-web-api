import { GenerateDocumentRequest, RequestEvent } from "../../models/document-generation";
import { HothProvisionRequest } from "../../models/provisioning-jobs";
import { CostRequest, CostResponse } from "../../models/cost-jobs";
import { APIGatewayProxyEvent } from "aws-lambda";

export type CommonMiddlewareInputs =
  | RequestEvent<HothProvisionRequest | CostRequest | CostResponse | GenerateDocumentRequest>
  | APIGatewayProxyEvent;
