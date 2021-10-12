import { AccessLevel } from "../../models/AccessLevel";
import { Application } from "../../models/Application";
import { ApplicationStep } from "../../models/ApplicationStep";
import { Environment } from "../../models/Environment";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { v4 as uuidv4 } from "uuid";
import { PortfolioDraftSummary } from "../../models/PortfolioDraftSummary";
import { PortfolioDraft } from "../../models/PortfolioDraft";
import { PortfolioOperator } from "../../models/PortfolioOperator";
import { AppEnvOperator } from "../../models/AppEnvOperator";

const mockPortoflioOperatorYoda: PortfolioOperator = {
  display_name: "Yoda",
  email: "yoda@iam.mil",
  access: AccessLevel.PORTFOLIO_ADMINISTRATOR,
};
const mockAppEnvOperatorDarthVader: AppEnvOperator = {
  display_name: "Darth Vader",
  email: "iam@yourfather.mil",
  access: AccessLevel.ADMINISTRATOR,
};
const mockAppEnvOperatorLandonisCalrissian: AppEnvOperator = {
  display_name: "Landonis Calrissian",
  email: "thegambler@cloudcity.mil",
  access: AccessLevel.READ_ONLY,
};
const mockAppEnvOperatorLukeSkywalker: AppEnvOperator = {
  display_name: "Luke Skywalker",
  email: "lostmy@hand.mil",
  access: AccessLevel.READ_ONLY,
};
const mockAppEnvOperatorSalaciousCrumb: AppEnvOperator = {
  display_name: "Salacious Crumb",
  email: "monkey@lizard.mil",
  access: AccessLevel.ADMINISTRATOR,
};
const mockAppEnvOperatorHanSolo: AppEnvOperator = {
  display_name: "Han Solo",
  email: "frozen@carbonite.mil",
  access: AccessLevel.READ_ONLY,
};
const mockAppEnvOperatorBobaFett: AppEnvOperator = {
  display_name: "Boba Fett",
  email: "original@mandalorian.mil",
  access: AccessLevel.READ_ONLY,
};

const mockEnvironmentCcepProd: Environment = {
  name: "production",
  operators: [mockAppEnvOperatorDarthVader, mockAppEnvOperatorLandonisCalrissian, mockAppEnvOperatorLukeSkywalker],
};
const mockEnvironmentJpeaStage: Environment = {
  name: "stage",
  operators: [mockAppEnvOperatorSalaciousCrumb, mockAppEnvOperatorHanSolo, mockAppEnvOperatorBobaFett],
};
const mockEnvironmentJpeaDev: Environment = {
  name: "development",
  operators: [mockAppEnvOperatorSalaciousCrumb, mockAppEnvOperatorHanSolo, mockAppEnvOperatorBobaFett],
};

/**
 * "Cloud City Evac Planner" from API spec
 */
export const mockApplicationCloudCityEvacPlanner: Application = {
  name: "Cloud City Evac Planner",
  description: "Application for planning an emergency evacuation",
  environments: [mockEnvironmentCcepProd],
  operators: mockEnvironmentCcepProd.operators,
};

/**
 * "Jabba's Palace Expansion App" from API spec
 */
export const mockApplicationJabbasPalaceExpansionApp: Application = {
  name: "Jabba's Palace Expansion App",
  description: "Planning application for palace expansion",
  environments: [mockEnvironmentJpeaDev, mockEnvironmentJpeaStage],
  operators: mockEnvironmentJpeaDev.operators,
};

/**
 * ApplicationStepEx from API spec
 * @returns a complete ApplicationStep with good data
 */
export const mockApplicationStep: ApplicationStep = {
  applications: [mockApplicationCloudCityEvacPlanner, mockApplicationJabbasPalaceExpansionApp],
  operators: [mockPortoflioOperatorYoda],
};

const now = new Date().toISOString();
/**
 * A base Portfolio Draft Summary
 * @returns a base portfolio summary with good data
 */
export const mockBasePortfolioSummary: PortfolioDraftSummary = {
  id: uuidv4(),
  status: ProvisioningStatus.NOT_STARTED,
  updated_at: now,
  created_at: now,
  name: "",
  description: "",
  num_portfolio_managers: 0,
  num_task_orders: 0,
  num_applications: 0,
  num_environments: 0,
};

/**
 * A good Portfolio Draft Summary item with the application step completed
 * after a successful DynamoDB update
 * @returns a Portfolio Draft Summary with good data
 */
export const mockPortfolioDraftSummary: PortfolioDraft = {
  ...mockBasePortfolioSummary,
  application_step: mockApplicationStep,
  num_applications: mockApplicationStep.applications.length,
  num_environments: mockApplicationStep.applications.flatMap((app) => app.environments).length,
} as PortfolioDraft;

/** ABOVE THIS LINE ARE VALID OBJECTS WITH GOOD DATA **/
/** BELOW THIS LINE ARE INVALID OBJECTS WITH MISSING FIELDS AND BAD DATA **/

/**
 * An array of Environment-looking objects with missing fields
 * that should be rejected by isEnvironment()
 */
export const mockBadOperatorEmails = [
  { ...mockPortoflioOperatorYoda, email: "yoda@iam.com" },
  { ...mockAppEnvOperatorSalaciousCrumb, email: "monkey@lizard.io" },
  { ...mockAppEnvOperatorDarthVader, email: "dark!#$%^&*()-+=@side.mil" },
  { ...mockAppEnvOperatorHanSolo, email: "frozen1234567890@carbonite!#$%^&*()-+=.123" },
  { ...mockAppEnvOperatorLandonisCalrissian, email: "thegambler@cloudcity:<>,./_1234567890.MIL" },
  { ...mockAppEnvOperatorLukeSkywalker, email: "lostmy@hand_!#$%@^&*()-+=.com" },
];
/**
 * An array of Environment-looking objects with missing fields
 * that should be rejected by isEnvironment()
 */
export const mockEnvironmentsMissingFields = [
  {
    // name: "production",
    operators: [mockAppEnvOperatorSalaciousCrumb, mockAppEnvOperatorHanSolo, mockAppEnvOperatorBobaFett],
  },
  {
    name: "production",
    // operators: [mockAppEnvOperatorSalaciousCrumb, mockAppEnvOperatorHanSolo, mockAppEnvOperatorBobaFett],
  },
];

/**
 * An array of Application-looking objects with missing fields
 * that should be rejected by isApplication()
 */
export const mockApplicationsMissingFields = [
  {
    // name: "Cloud City Evac Planner",
    description: "Application for planning an emergency evacuation",
    environments: [mockEnvironmentCcepProd],
    operators: mockEnvironmentJpeaDev.operators,
  },
  {
    name: "Cloud City Evac Planner",
    // description: "Application for planning an emergency evacuation",
    environments: [mockEnvironmentCcepProd],
    operators: mockEnvironmentJpeaDev.operators,
  },
  {
    name: "Cloud City Evac Planner",
    description: "Application for planning an emergency evacuation",
    // environments: [mockEnvironmentCcepProd],
    operators: mockEnvironmentJpeaDev.operators,
  },
  {
    name: "Cloud City Evac Planner",
    description: "Application for planning an emergency evacuation",
    environments: [mockEnvironmentCcepProd],
    // operators: mockEnvironmentJpeaDev.operators,
  },
];

/**
 * An array of ApplicationStep-looking objects with missing fields
 * that should be rejected by isApplicationStep()
 */
export const mockApplicationStepsMissingFields = [
  {
    // applications: [],
    operators: [mockPortoflioOperatorYoda],
  },
  {
    applications: [],
    // operators: [mockPortoflioOperatorYoda],
  },
];

/**
 * An array of ApplicationStep objects with bad data
 * that should cause input validation errors
 */
export const mockApplicationStepsBadData: Array<ApplicationStep> = [
  {
    ...mockApplicationStep,
    applications: [{ ...mockApplicationCloudCityEvacPlanner, name: "abc" }], // too short
    operators: [{ ...mockPortoflioOperatorYoda, display_name: "" }], // too short display_name
  },
  {
    ...mockApplicationStep,
    applications: [
      {
        ...mockApplicationCloudCityEvacPlanner,
        // too long
        name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut eleifend lectus ut luctus ultricies nisi.",
        operators: [
          {
            ...mockAppEnvOperatorHanSolo,
            // too long
            display_name:
              "waaaaaaaaaaaaaaaaaaaaaaaaayyyyyy tooooooooooooooooooooooooooooooooooooo loooooooooonnnnnnnnnnngggggggggg",
          },
        ],
      },
    ],
  },
  {
    ...mockApplicationStep,
    applications: [
      {
        ...mockApplicationCloudCityEvacPlanner,
        environments: [
          {
            ...mockEnvironmentCcepProd,
            // too short
            name: "abc",
            operators: [
              {
                ...mockAppEnvOperatorBobaFett,
                // too short
                display_name: "",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    ...mockApplicationStep,
    applications: [
      {
        ...mockApplicationCloudCityEvacPlanner,
        environments: [
          {
            ...mockEnvironmentCcepProd,
            // too long
            name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut eleifend lectus ut luctus ultricies nisi.",
            operators: [
              {
                ...mockAppEnvOperatorLandonisCalrissian,
                // too long
                display_name:
                  "waaaaaaaaaaaaaaaaaaaaaaaaayyyyyy tooooooooooooooooooooooooooooooooooooo loooooooooonnnnnnnnnnngggggggggg",
              },
            ],
          },
        ],
      },
    ],
  },
];

/**
 * A bad Portfolio Draft Summary item with the application step completed
 * @returns a Portfolio Draft Summary with incorrect # of apps and envs
 */
export const mockBadPortfolioDraftSummary: PortfolioDraft = {
  ...mockBasePortfolioSummary,
  application_step: mockApplicationStep,
  num_applications: 77,
  num_environments: 99,
} as PortfolioDraft;
