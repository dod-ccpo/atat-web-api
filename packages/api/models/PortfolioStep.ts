import { CloudServiceProvider } from "./CloudServiceProvider";
export interface PortfolioStep {
  name: string;
  csp: CloudServiceProvider;
  description?: string;
  dod_components: Array<string>;
  portfolio_managers: Array<string>;
}

export const schema = {
  required: ["csp", "dod_components", "name", "portfolio_managers"],
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
  additionalProperties: false,
  description: "Represents step 1 of the Portfolio Draft Wizard",
};
// Because the validator checks the ApiGatewayProxyEvent event.body, we need to wrap it in a body.
export const schemaWrapper = {
  type: "object",
  required: ["body"],
  properties: {
    body: schema,
  },
};
