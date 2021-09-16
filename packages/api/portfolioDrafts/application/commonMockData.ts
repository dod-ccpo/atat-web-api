import { AccessLevel } from "../../models/AccessLevel";
import { Application } from "../../models/Application";
import { ApplicationStep } from "../../models/ApplicationStep";
import { Environment } from "../../models/Environment";
import { Operator } from "../../models/Operator";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { v4 as uuidv4 } from "uuid";
import { PortfolioDraftSummary } from "../../models/PortfolioDraftSummary";

const mockOperatorDarthVader: Operator = {
  first_name: "Darth",
  last_name: "Vader",
  email: "iam@yourfather.com",
  access: AccessLevel.ADMINISTRATOR,
};
const mockOperatorLandonisCalrissian: Operator = {
  first_name: "Landonis",
  last_name: "Calrissian",
  email: "thegambler@cloudcity.com",
  access: AccessLevel.READ_ONLY,
};
const mockOperatorLukeSkywalker: Operator = {
  first_name: "Luke",
  last_name: "Skywalker",
  email: "lostmy@hand.com",
  access: AccessLevel.READ_ONLY,
};
const mockOperatorSalaciousCrumb: Operator = {
  first_name: "Salacious",
  last_name: "Crumb",
  email: "monkey@lizard.com",
  access: AccessLevel.ADMINISTRATOR,
};
const mockOperatorHanSolo: Operator = {
  first_name: "Han",
  last_name: "Solo",
  email: "frozen@carbonite.com",
  access: AccessLevel.READ_ONLY,
};
const mockOperatorBobaFett: Operator = {
  first_name: "Boba",
  last_name: "Fett",
  email: "original@mandalorian.com",
  access: AccessLevel.READ_ONLY,
};

const mockEnvironmentCcepProd: Environment = {
  name: "production",
  operators: [mockOperatorDarthVader, mockOperatorLandonisCalrissian, mockOperatorLukeSkywalker],
};
const mockEnvironmentJpeaDev: Environment = {
  name: "development",
  operators: [mockOperatorSalaciousCrumb, mockOperatorHanSolo, mockOperatorBobaFett],
};

/**
 * "Cloud City Evac Planner" from API spec
 */
export const mockApplicationCloudCityEvacPlanner: Application = {
  name: "Cloud City Evac Planner",
  description: "Application for planning an emergency evacuation",
  environments: [mockEnvironmentCcepProd],
};

/**
 * "Jabba's Palace Expansion App" from API spec
 */
export const mockApplicationJabbasPalaceExpansionApp: Application = {
  name: "Jabba's Palace Expansion App",
  description: "Planning application for palace expansion",
  environments: [mockEnvironmentJpeaDev],
};

/**
 * ApplicationStepEx from API spec
 * @returns a complete ApplicationStep with good data
 */
export const mockApplicationStep: ApplicationStep = {
  applications: [mockApplicationCloudCityEvacPlanner, mockApplicationJabbasPalaceExpansionApp],
};

/** ABOVE THIS LINE ARE VALID OBJECTS WITH GOOD DATA **/
/** BELOW THIS LINE ARE INVALID OBJECTS WITH MISSING FIELDS AND BAD DATA **/

/**
 * An array of Environment-looking objects with missing fields
 * that should be rejected by isEnvironment()
 */
export const mockEnvironmentsMissingFields = [
  {
    // name: "production",
    operators: [mockOperatorDarthVader, mockOperatorLandonisCalrissian, mockOperatorLukeSkywalker],
  },
  {
    name: "production",
    // operators: [mockOperatorDarthVader, mockOperatorLandonisCalrissian, mockOperatorLukeSkywalker],
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
  },
  {
    name: "Cloud City Evac Planner",
    // description: "Application for planning an emergency evacuation",
    environments: [mockEnvironmentCcepProd],
  },
  {
    name: "Cloud City Evac Planner",
    description: "Application for planning an emergency evacuation",
    // environments: [mockEnvironmentCcepProd],
  },
];

/**
 * An array of ApplicationStep-looking objects with missing fields
 * that should be rejected by isApplicationStep()
 */
export const mockApplicationStepsMissingFields = [
  {
    // applications: [],
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
  },
  {
    ...mockApplicationStep,
    applications: [
      {
        ...mockApplicationCloudCityEvacPlanner,
        // too long
        name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut eleifend lectus ut luctus ultricies nisi.",
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
          },
        ],
      },
    ],
  },
];

/**
 * A base Portfolio Draft Summary
 * @returns a base portfolio summary with good data
 */
export function mockBasePortfolioSummary(): PortfolioDraftSummary {
  return {
    id: uuidv4(),
    status: ProvisioningStatus.NOT_STARTED,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

/**
 * A good Portfolio Draft Summary item with the application step completed
 * after a successful DynamoDB update
 * @returns a Portfolio Draft Summary with good data
 */
export function mockPortfolioDraftSummary(): PortfolioDraftSummary {
  return {
    ...mockBasePortfolioSummary(),
    application_step: mockApplicationStep,
    num_applications: mockApplicationStep.applications.length,
    num_environments: mockApplicationStep.applications.flatMap((app) => app.environments).length,
  } as PortfolioDraftSummary;
}

/**
 * A bad Portfolio Draft Summary item with the application step completed
 * @returns a Portfolio Draft Summary with incorrect # of apps and envs
 */
export function mockBadPortfolioDraftSummary(): PortfolioDraftSummary {
  return {
    ...mockBasePortfolioSummary(),
    application_step: mockApplicationStep,
    num_applications: 77,
    num_environments: 99,
  } as PortfolioDraftSummary;
}
