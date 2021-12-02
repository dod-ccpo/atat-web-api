import { AppEnvAccess, PortfolioAccess, PortfolioOperatorModel, AppEnvOperatorModel } from "../../models/Operator";
import { ApplicationModel } from "../../models/Application";
import { ApplicationStepModel } from "../../models/ApplicationStep";
import { EnvironmentModel } from "../../models/Environment";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { v4 as uuidv4 } from "uuid";
import { PortfolioDraftSummaryModel } from "../../models/PortfolioDraftSummary";
import { PortfolioDraftModel } from "../../models/PortfolioDraft";

const mockPortoflioOperatorYoda: PortfolioOperatorModel = {
  display_name: "Yoda",
  email: "yoda@iam.mil",
  access: PortfolioAccess.PORTFOLIO_ADMINISTRATOR,
};
const mockAppEnvOperatorDarthVader: AppEnvOperatorModel = {
  display_name: "Darth Vader",
  email: "iam@yourfather.mil",
  access: AppEnvAccess.ADMINISTRATOR,
};
const mockAppEnvOperatorLandonisCalrissian: AppEnvOperatorModel = {
  display_name: "Landonis Calrissian",
  email: "thegambler@cloudcity.mil",
  access: AppEnvAccess.READ_ONLY,
};
const mockAppEnvOperatorLukeSkywalker: AppEnvOperatorModel = {
  display_name: "Luke Skywalker",
  email: "lostmy@hand.mil",
  access: AppEnvAccess.READ_ONLY,
};
const mockAppEnvOperatorSalaciousCrumb: AppEnvOperatorModel = {
  display_name: "Salacious Crumb",
  email: "monkey@lizard.mil",
  access: AppEnvAccess.ADMINISTRATOR,
};
const mockAppEnvOperatorHanSolo: AppEnvOperatorModel = {
  display_name: "Han Solo",
  email: "frozen@carbonite.mil",
  access: AppEnvAccess.READ_ONLY,
};
const mockAppEnvOperatorBobaFett: AppEnvOperatorModel = {
  display_name: "Boba Fett",
  email: "original@mandalorian.mil",
  access: AppEnvAccess.READ_ONLY,
};

const mockEnvironmentCcepProd: EnvironmentModel = {
  name: "production",
  operators: [mockAppEnvOperatorDarthVader, mockAppEnvOperatorLandonisCalrissian, mockAppEnvOperatorLukeSkywalker],
};
const mockEnvironmentJpeaStage: EnvironmentModel = {
  name: "stage",
  operators: [mockAppEnvOperatorSalaciousCrumb, mockAppEnvOperatorHanSolo, mockAppEnvOperatorBobaFett],
};
const mockEnvironmentJpeaDev: EnvironmentModel = {
  name: "development",
  operators: [mockAppEnvOperatorSalaciousCrumb, mockAppEnvOperatorHanSolo, mockAppEnvOperatorBobaFett],
};

/**
 * "Cloud City Evac Planner" from API spec
 */
export const mockApplicationCloudCityEvacPlanner: ApplicationModel = {
  name: "Cloud City Evac Planner",
  description: "Application for planning an emergency evacuation",
  environments: [mockEnvironmentCcepProd],
  operators: mockEnvironmentCcepProd.operators,
};

/**
 * "Jabba's Palace Expansion App" from API spec
 */
export const mockApplicationJabbasPalaceExpansionApp: ApplicationModel = {
  name: "Jabba Palace Expansion App",
  description: "Planning application for palace expansion",
  environments: [mockEnvironmentJpeaDev, mockEnvironmentJpeaStage],
  operators: mockEnvironmentJpeaDev.operators,
};

/**
 * ApplicationStepEx from API spec
 * @returns a complete ApplicationStep with good data
 */
export const mockApplicationStep: ApplicationStepModel = {
  applications: [mockApplicationCloudCityEvacPlanner, mockApplicationJabbasPalaceExpansionApp],
  operators: [mockPortoflioOperatorYoda],
};

const now = new Date().toISOString();
/**
 * A base Portfolio Draft Summary
 * @returns a base portfolio summary with good data
 */
export const mockBasePortfolioSummary: PortfolioDraftSummaryModel = {
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
export const mockPortfolioDraftSummary: PortfolioDraftModel = {
  ...mockBasePortfolioSummary,
  application_step: mockApplicationStep,
  num_applications: mockApplicationStep.applications.length,
  num_environments: mockApplicationStep.applications.flatMap((app) => app.environments).length,
} as PortfolioDraftModel;

/**
 * An array of good application step items with acceptable admin roles
 * to match business rules
 * @returns an array of good application steps
 */
export const mockApplicationsStepWithGoodAdminRoles: ApplicationStepModel[] = [
  { ...mockApplicationStep },
  { ...mockApplicationStep, operators: [] },
  {
    ...mockApplicationStep,
    operators: [],
    applications: [
      {
        name: "Cool App",
        operators: [{ ...mockApplicationStep.applications[0].operators[0], access: AppEnvAccess.ADMINISTRATOR }],
        environments: [{ name: "Paradise", operators: [] }],
      },
      {
        name: "Different App",
        operators: [],
        environments: [
          {
            name: "sandbox",
            operators: [{ ...mockApplicationStep.applications[0].operators[0], access: AppEnvAccess.ADMINISTRATOR }],
          },
          {
            name: "develop",
            operators: [{ ...mockApplicationStep.applications[0].operators[0], access: AppEnvAccess.ADMINISTRATOR }],
          },
        ],
      },
    ],
  },
];

/** ABOVE THIS LINE ARE VALID OBJECTS WITH GOOD DATA **/
/** BELOW THIS LINE ARE INVALID OBJECTS WITH MISSING FIELDS AND BAD DATA **/

/**
 * An array of Operator objects with invalid emails
 * that should be rejected in the Application Step
 */
export const mockBadOperatorEmails = [
  { ...mockPortoflioOperatorYoda, email: "yoda@iam.com" },
  { ...mockAppEnvOperatorSalaciousCrumb, email: "monkey@lizard.io" },
  { ...mockAppEnvOperatorHanSolo, email: "frozen1234567890@carbonite!#$%^&*()-+=.123" },
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
 * An environment of Application-looking objects with invalid properties
 * that should be rejected
 */
export const badEnvironmentInApplication = [
  {
    name: "Cloud City Evac Planner",
    description: "Some Application",
    environments: [
      {
        badName: "bad",
        noOperators: [],
      },
    ],
    operators: [],
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
  {
    name: "Cloud City Evac Planner",
    environments: [mockEnvironmentCcepProd],
    operators: mockEnvironmentJpeaDev.operators,
    noDescription: "This is not a description",
    someOtherProp: "unknown",
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
export const mockApplicationStepsBadData: Array<ApplicationStepModel> = [
  {
    ...mockApplicationStep,
    applications: [
      // too short application name
      { ...mockApplicationCloudCityEvacPlanner, name: "abc" },
      // too long application name
      {
        ...mockApplicationCloudCityEvacPlanner,
        name: "app name that is way too long for this app name that is way too long for this app name that is way too long for this",
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
            // too short environment name
            name: "",
          },
          {
            ...mockEnvironmentCcepProd,
            // too long environment name
            name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut eleifend lectus ut luctus ultricies nisi.",
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
        operators: [
          {
            ...mockAppEnvOperatorDarthVader,
            // too short operator name
            display_name: "",
          },
        ],
        environments: [
          {
            ...mockEnvironmentCcepProd,
            operators: [
              {
                ...mockAppEnvOperatorLandonisCalrissian,
                // too long operator name
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
 * An array of ApplicationStep objects with missing operator display_name
 * property at each level that should cause input validation errors
 */
export const mockOperatorMissingDisplayNameFields = [
  {
    ...mockApplicationStep,
    operators: [
      {
        // display_name: "Salacious Crumb",
        email: "monkey@lizard.mil",
        access: PortfolioAccess.PORTFOLIO_ADMINISTRATOR,
      },
    ],
  },
  {
    ...mockApplicationStep,
    applications: [
      {
        ...mockApplicationCloudCityEvacPlanner,
        operators: [
          {
            // display_name: "Salacious Crumb",
            email: "monkey@lizard.mil",
            access: AppEnvAccess.ADMINISTRATOR,
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
            operators: [
              {
                // display_name: "Salacious Crumb",
                email: "monkey@lizard.mil",
                access: AppEnvAccess.ADMINISTRATOR,
              },
            ],
          },
        ],
      },
    ],
  },
];
/**
 * An array of ApplicationStep objects with missing operator email
 * property at each level that should cause input validation errors
 */
export const mockOperatorMissingEmailFields = [
  {
    ...mockApplicationStep,
    operators: [
      {
        display_name: "Salacious Crumb",
        // email: "monkey@lizard.mil",
        access: PortfolioAccess.PORTFOLIO_ADMINISTRATOR,
      },
    ],
  },
  {
    ...mockApplicationStep,
    applications: [
      {
        ...mockApplicationCloudCityEvacPlanner,
        operators: [
          {
            display_name: "Salacious Crumb",
            // email: "monkey@lizard.mil",
            access: AppEnvAccess.ADMINISTRATOR,
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
            operators: [
              {
                display_name: "Salacious Crumb",
                // email: "monkey@lizard.mil",
                access: AppEnvAccess.ADMINISTRATOR,
              },
            ],
          },
        ],
      },
    ],
  },
];
/**
 * An array of ApplicationStep objects with missing operator access
 * property at each level that should cause input validation errors
 */
export const mockOperatorMissingAccessFields = [
  {
    ...mockApplicationStep,
    operators: [
      {
        display_name: "Salacious Crumb",
        email: "monkey@lizard.mil",
        // access: PortfolioAccess.PORTFOLIO_ADMINISTRATOR,
      },
    ],
  },
  {
    ...mockApplicationStep,
    applications: [
      {
        ...mockApplicationCloudCityEvacPlanner,
        operators: [
          {
            display_name: "Salacious Crumb",
            email: "monkey@lizard.mil",
            // access: AppEnvAccess.ADMINISTRATOR,
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
            operators: [
              {
                display_name: "Salacious Crumb",
                email: "monkey@lizard.mil",
                // access: AppEnvAccess.ADMINISTRATOR,
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
export const mockBadPortfolioDraftSummary: PortfolioDraftModel = {
  ...mockBasePortfolioSummary,
  application_step: mockApplicationStep,
  num_applications: 77,
  num_environments: 99,
} as PortfolioDraftModel;

/**
 * An array of bad application step items with admin roles
 * that do not follow the business rules
 * @returns an array of bad application steps
 */
export const mockApplicationsStepWithBadAdminRoles: ApplicationStepModel[] = [
  {
    ...mockApplicationStep,
    operators: [],
    applications: [
      {
        name: "Escape App",
        operators: [],
        environments: [{ name: "Paradise", operators: [] }],
      },
      {
        name: "Other App",
        operators: [],
        environments: [
          {
            name: "Random Env 1",
            operators: [],
          },
          {
            name: "develop 1",
            operators: [{ ...mockApplicationStep.applications[0].operators[0], access: AppEnvAccess.ADMINISTRATOR }],
          },
        ],
      },
    ],
  },
  {
    ...mockApplicationStep,
    operators: [],
    applications: [
      {
        ...mockApplicationStep.applications[0],
        operators: [{ ...mockApplicationStep.applications[1].operators[0], access: AppEnvAccess.ADMINISTRATOR }],
        environments: [{ name: "no operators", operators: [] }],
      },
      {
        ...mockApplicationStep.applications[1],
        operators: [],
        environments: [
          {
            name: "Best sandbox",
            operators: [{ ...mockApplicationStep.applications[1].operators[1], access: AppEnvAccess.ADMINISTRATOR }],
          },
          {
            name: "Best develop",
            operators: [{ ...mockApplicationStep.applications[1].operators[3], access: AppEnvAccess.ADMINISTRATOR }],
          },
        ],
      },
      {
        name: "Legacy App",
        operators: [],
        environments: [
          {
            name: "legacy-sandbox",
            operators: [{ ...mockApplicationStep.applications[1].operators[0], access: AppEnvAccess.ADMINISTRATOR }],
          },
          {
            name: "legacy-stage",
            operators: [],
          },
          {
            name: "legacy-develop",
            operators: [{ ...mockApplicationStep.applications[1].operators[0], access: AppEnvAccess.ADMINISTRATOR }],
          },
        ],
      },
    ],
  },
];

export const mockBadApplicationDescriptions = {
  ...mockApplicationStep,
  applications: [
    {
      ...mockApplicationStep.applications[0],
      description: "Application for planning an emergency evacuation !@#$%^&*_|:;.-.",
    },
    {
      ...mockApplicationStep.applications[0],
      // invalid special chars
      description: "Application for planning an emergency evacuation (+=?{[]<>})",
    },
    {
      ...mockApplicationStep.applications[1],
      // too long
      description:
        "Application for planning an emergency evacuation. Application for planning an emergency evacuation.Application for planning an emergency evacuation.Application for planning an emergency evacuation.Application for planning an emergency evacuation.Application for planning an emergency evacuation.Application for planning an emergency evacuation.",
    },
  ],
};
