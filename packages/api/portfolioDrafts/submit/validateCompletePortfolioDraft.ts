import { Context } from "aws-lambda";
import { PortfolioDraft } from "../../models/PortfolioDraft";
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import schema = require("../../models/schema.json");
import errorHandlingMiddleware from "../../utils/errorHandlingMiddleware";

export enum ValidationResult {
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
export async function baseHandler(stateInput: PortfolioDraft, context?: Context): Promise<ValidatedPortfolioDraft> {
  console.log("EVENT INPUT (stringified): " + JSON.stringify(stateInput));
  console.log("EVENT INPUT: " + stateInput);

  // if it makes it pass middy to here, safe to say validation was good
  const validationUpdate = { ...stateInput, validationResult: ValidationResult.SUCCESS };
  console.log("UPDATED RESPONSE: " + JSON.stringify(validationUpdate));
  return validationUpdate;
}

const completePortfolioStepSchema = {
  type: "object",
  required: ["body"],
  properties: {
    body: {
      type: "object",
      required: ["portfolio_step", "funding_step", "application_step", "id", "submit_id", "status", "name"],
      properties: {
        portfolio_step: schema.PortfolioStep,
        funding_step: schema.FundingStep,
        application_step: schema.ApplicationStep,
        id: schema.BaseObject.properties.id,
        created_at: schema.BaseObject.properties.created_at,
        updated_at: schema.BaseObject.properties.updated_at,
        submit_id: { type: "string" },
        status: { type: "string", enum: ["in_progress"] },
        name: schema.PortfolioDraftSummary.allOf[1].properties.name,
        description: schema.PortfolioDraftSummary.allOf[1].properties.description,
        num_portfolio_managers: schema.PortfolioDraftSummary.allOf[1].properties.num_portfolio_managers,
        num_environments: schema.PortfolioDraftSummary.allOf[1].properties.num_environments,
        num_applications: schema.PortfolioDraftSummary.allOf[1].properties.num_applications,
        num_task_orders: schema.PortfolioDraftSummary.allOf[1].properties.num_task_orders,
      },
    },
  },
};

const provisioningValidationErrorHandlingMiddleware = (): middy.MiddlewareObj<PortfolioDraft> => {
  const onError: middy.MiddlewareFn<any | ValidatedPortfolioDraft> = async (request): Promise<any | void> => {
    return { ...request.event, validationResult: ValidationResult.FAILED, error: { ...request.error } };
  };
  return {
    onError,
  };
};

export const handler = middy(baseHandler)
  .use(jsonBodyParser())
  .use(
    validator({
      inputSchema: completePortfolioStepSchema,
    })
  )
  .use(provisioningValidationErrorHandlingMiddleware());
// .use(errorHandlingMiddleware())
