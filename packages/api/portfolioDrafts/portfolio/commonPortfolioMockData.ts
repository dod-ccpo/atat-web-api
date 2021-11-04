import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { PortfolioStep } from "../../models/PortfolioStep";

// The example PortfolioStepEx from the API Specification
export const mockPortfolioStep: PortfolioStep = {
  name: "Mock Portfolio",
  csp: CloudServiceProvider.CSP_A,
  description: "Mock portfolio description",
  dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
  portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
};

export const mockValidPortfolioSteps: PortfolioStep[] = [
  mockPortfolioStep,
  // This checks that we don't regress and error on a body that we worked to debug.
  // The issue at the time seemed to be due to a missing `description` field in the
  // request body.
  {
    name: "Tonys Portfolio 10",
    csp: CloudServiceProvider.CSP_A,
    dod_components: ["marine_corps", "combatant_command", "joint_staff"],
    portfolio_managers: [],
  },
];

/* ABOVE THIS LINE ARE VALID OBJECTS WITH GOOD DATA */
/* BELOW THIS LINE ARE INVALID OBJECTS WITH MISSING FIELDS AND BAD DATA */

/**
 * An array of PortfolioStep-looking objects with missing fields
 * that should be rejected by isPortfolioStep()
 */
export const mockPortfolioStepMissingFields = [
  {
    // name: "Mock Portfolio",
    csp: CloudServiceProvider.CSP_A,
    description: "Mock portfolio description",
    dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
    portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
  },
  {
    name: "Mock Portfolio",
    // csp: CloudServiceProvider.CSP_A,
    description: "Mock portfolio description",
    dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
    portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
  },
  // description field is not required, so that variation not included here
  {
    name: "Mock Portfolio",
    csp: CloudServiceProvider.CSP_A,
    description: "Mock portfolio description",
    // dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
    portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
  },
  {
    name: "Mock Portfolio",
    csp: CloudServiceProvider.CSP_A,
    description: "Mock portfolio description",
    dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
    // portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
  },
];
