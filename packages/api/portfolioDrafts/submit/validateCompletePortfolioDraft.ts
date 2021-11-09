import { APIGatewayProxyResult, Context } from "aws-lambda";
import { PortfolioDraft, PORTFOLIO_STEP } from "../../models/PortfolioDraft";
import { PortfolioStep } from "../../models/PortfolioStep";
import { ApiSuccessResponse, SuccessStatusCode, SetupError } from "../../utils/response";
import { validateRequestShape } from "../../utils/requestValidation";
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import schema = require("../../models/schema.json");
import { PortfolioDraftSummary, portfolioDraftSummaryProperties } from "../../models/PortfolioDraftSummary";

const completePortfolioStepSchema = {
  type: "object",
  required: ["body"],
  properties: {
    body: {
      type: "object",
      required: ["portfolio_step", "funding_step", "application_step"],
      properties: {
        portfolio_step: schema.PortfolioStep,
        funding_step: schema.FundingStep,
        application_step: schema.ApplicationStep,
        id: { type: "string" },
        submit_id: { type: "string" },
        status: { type: "string", enum: ["in_progress"] },
        // this probably needs some work (or leave it out with Parameters/Payload in step fn)
        // ...schema.PortfolioDraftSummary,
      },
    },
  },
};
console.log("SCHEMA: " + JSON.stringify(completePortfolioStepSchema));

enum ValidationResult {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export interface ValidatedPortfolioDraft extends PortfolioDraft {
  validationResult?: ValidationResult;
}

/**
 * Validates the completed Portfolio Draft before sending to CSP
 * for provisioning of resources
 *
 * @param stateInput - The input to the Step Function start execution lambda
 */
export async function handler(stateInput: PortfolioDraft, context?: Context): Promise<ValidatedPortfolioDraft> {
  console.log("EVENT INPUT (stringified): " + JSON.stringify(stateInput));
  console.log("EVENT INPUT: " + stateInput);

  // if it makes it pass middy to here, safe to say validation was good
  const validationUpdate = { ...stateInput, validationResult: ValidationResult.SUCCESS };
  console.log("UPDATED RESPONSE: " + JSON.stringify(validationUpdate));
  return validationUpdate;
}

// export const handler = middy(baseHandler);
// handler
//   .use(jsonBodyParser())
//   .use(
//     validator({
//       inputSchema: wrapSchema(completePortfolioStepSchema),
//       ajvOptions: { strict: false },
//     })
//   )
//   .use(JSONErrorHandlerMiddleware());
