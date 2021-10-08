import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
// import middleware from "../utils/middleware";
// import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/apiGateway";
// import jsonBodyParser from "@middy/http-json-body-parser";
// import httpErrorHandler from "@middy/http-error-handler";
// import validator from "@middy/validator";

async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // the returned response will be checked against the type `APIGatewayProxyResult`
  console.log(event.body);
  return {
    statusCode: 200,
    body: "Hello world",
  };
}

const handler = middy(baseHandler);

// This is the model output for the schema of the portfoliostep
// working on a way to generate this from the yaml file
const portfolioSchema = {
  required: ["name"],
  type: "object",
  properties: {
    csp: {
      type: "string",
      enum: ["aws", "azure"],
    },
    portfolio_managers: {
      type: "array",
      items: {
        type: "string",
        format: "email",
      },
    },
    dod_components: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "air_force",
          "army",
          "marine_corps",
          "navy",
          "space_force",
          "combatant_command",
          "joint_staff",
          "dafa",
          "osd_psas",
          "nsa",
        ],
      },
    },
    name: {
      type: "string",
    },
    description: {
      type: "string",
    },
  },
  description: "Represents step 1 of the Portfolio Draft Wizard",
};

// handler.use(validator({ inputSchema: portfolioSchema })).use(httpErrorHandler());

export { handler };
