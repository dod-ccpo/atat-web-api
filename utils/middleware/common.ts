import { GenerateDocumentRequest, RequestEvent } from "../../models/document-generation";
import { CostRequest, CostResponse } from "../../models/cost-jobs";
import { APIGatewayProxyEvent } from "aws-lambda";
import { HothProvisionRequest } from "../../api/client";

export type CommonMiddlewareInputs =
  | RequestEvent<HothProvisionRequest | CostRequest | CostResponse | GenerateDocumentRequest>
  | APIGatewayProxyEvent;
