import { CloudServiceProvider } from "./CloudServiceProvider";
export interface PortfolioStep {
  name: string;
  csp: CloudServiceProvider;
  description: string;
  dod_components: Array<string>;
  portfolio_managers: Array<string>;
}

export const schema = {
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
};
