import { GenerateDocumentRequest, RequestEvent } from "../../models/document-generation";
import { ProvisionRequest } from "../../models/provisioning-jobs";
import { CostRequest, CostResponse } from "../../models/cost-jobs";
import { APIGatewayProxyEvent } from "aws-lambda";

export type CommonMiddlewareInputs =
  | RequestEvent<ProvisionRequest | CostRequest | CostResponse | GenerateDocumentRequest>
  | APIGatewayProxyEvent;
