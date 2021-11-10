import { Context } from "aws-lambda";
import { PortfolioDraft } from "../../models/PortfolioDraft";
import middy from "@middy/core";
import validator from "@middy/validator";
import schema = require("../../models/schema.json");

export enum ValidationResult {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}
export interface ValidatedPortfolioDraft extends PortfolioDraft {
  validationResult: ValidationResult;
  error?: unknown;
}
interface StateInput {
  body: PortfolioDraft;
}

/**
 * Validates the completed Portfolio Draft before sending to CSP
 * for provisioning of resources
 *
 * @param stateInput - The input to the Step Function start execution lambda
 */
export async function baseHandler(stateInput: StateInput, context?: Context): Promise<ValidatedPortfolioDraft> {
  console.log("STATE INPUT: " + JSON.stringify(stateInput));

  // if it makes it pass middy to here, safe to say validation was good
  const validationUpdate = { ...stateInput.body, validationResult: ValidationResult.SUCCESS };
  console.log("UPDATED OUTPUT: " + JSON.stringify(validationUpdate));
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

const wrapStateMachineInput = (): middy.MiddlewareObj<any, any> => {
  // This wraps the input to the validation function in a body so that the validator is shaped
  // properly before validation otherwise an error is thrown for not having a body and the
  // input never gets pass the validator and into the validation function.
  const before: middy.MiddlewareFn<any, any> = async (request): Promise<void> => {
    request.event = { body: request.event };
  };

  // This catches any errors and adds a 'validationResult' to the output so that the next part
  // of the state machine can evaluate and execute the next state.
  const onError: middy.MiddlewareFn<any, any> = async (request): Promise<any | void> => {
    console.log("ON ERROR: An error occurred while validating the portfolio draft");
    console.log("ON ERROR: ", JSON.stringify(request));
    return { ...request.event, validationResult: ValidationResult.FAILED, error: { ...request.error } };
  };

  return {
    before,
    onError,
  };
};

export const handler = middy(baseHandler)
  .use(wrapStateMachineInput())
  .use(
    validator({
      inputSchema: completePortfolioStepSchema,
    })
  );
