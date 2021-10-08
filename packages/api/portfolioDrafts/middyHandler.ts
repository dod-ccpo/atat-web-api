import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
// import middleware from "../utils/middleware";
import jsonBodyParser from "@middy/http-json-body-parser";
import httpErrorHandler from "@middy/http-error-handler";
import validator from "@middy/validator";
import { schema } from "../models/PortfolioStep";

// example baseHandler function
async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log(event.body);
  return {
    statusCode: 200,
    body: "Hello world",
  };
}

const handler = middy(baseHandler);
handler
  .use(jsonBodyParser()) // parses request body into JSON object
  .use(validator({ inputSchema: schema })) // validates request body to see if it matches schema
  .use(httpErrorHandler()); // http error handlers and responses

export { handler };

// This is the model output for the schema of the portfoliostep, which will be taken from our api yaml as a TODO
// Currently it is being exported from the PortfolioStep Model, but it needs to be taken right from the spec.
// A problem in retrieving the model is that you need to wrap the model in a body object for it to validate properly
// Below is the schema used in validation:
/*
const schema = {
  type: "object",
  properties: {
    body: {
      type: "object",
      properties: {
        name: { type: "string" },
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
        description: {
          type: "string",
        },
      },
      required: ["name", "portfolio_managers", "description", "csp"], // Insert here all required event properties
    },
  },
}; */
// This is the schema output from our API yaml spec:
/*
{
  "required" : [ "csp", "dod_components", "name", "portfolio_managers" ],
  "type" : "object",
  "properties" : {
    "csp" : {
      "type" : "string",
      "enum" : [ "aws", "azure" ]
    },
    "portfolio_managers" : {
      "type" : "array",
      "items" : {
        "type" : "string",
        "format" : "email"
      }
    },
    "dod_components" : {
      "type" : "array",
      "items" : {
        "type" : "string",
        "enum" : [ "air_force", "army", "marine_corps", "navy", "space_force", "combatant_command", "joint_staff", "dafa", "osd_psas", "nsa" ]
      }
    },
    "name" : {
      "type" : "string"
    },
    "description" : {
      "type" : "string"
    }
  },
  "additionalProperties" : false,
  "description" : "Represents step 1 of the Portfolio Draft Wizard"
}
*/
// Notice how properties is wrapped in a body object, which is required to validate the event.body of the APIGatewayProxyEvent
