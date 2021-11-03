import { APIGatewayProxyEvent } from "aws-lambda";
import { mockApplicationStep } from "./application/commonApplicationMockData";
import { mockFundingStep } from "./funding/commonFundingMockData";
import { mockPortfolioStep } from "./portfolio/commonPortfolioMockData";
import { PortfolioDraft } from "../models/PortfolioDraft";
import { PortfolioDraftSummary } from "../models/PortfolioDraftSummary";
import { ProvisioningStatus } from "../models/ProvisioningStatus";
import { v4 as uuidv4 } from "uuid";

const now = new Date().toISOString();

export const mockPortfolioDraftSummary: PortfolioDraftSummary = {
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

export const mockPortfolioDraft: PortfolioDraft = {
  ...mockPortfolioDraftSummary,
  portfolio_step: mockPortfolioStep,
  funding_step: mockFundingStep,
  application_step: mockApplicationStep,
  num_portfolio_managers: mockPortfolioStep.portfolio_managers.length,
  num_task_orders: mockFundingStep.task_orders.length,
  num_applications: mockApplicationStep.applications.length,
  num_environments: mockApplicationStep.applications.flatMap((app) => app.environments).length,
  name: mockPortfolioStep.name,
};

export const validRequest: APIGatewayProxyEvent = {
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

/** ABOVE THIS LINE ARE VALID OBJECTS WITH GOOD DATA **/
/** BELOW THIS LINE ARE INVALID OBJECTS WITH MISSING FIELDS AND BAD DATA **/

/**
 * An array of PortfolioDraftSummary-looking objects with missing fields
 * that should be rejected by isPortfolioDraftSummary()
 */
export const mockPortfolioDraftSummaryMissingFields = [
  {
    // id: uuidv4(),
    status: ProvisioningStatus.NOT_STARTED,
    updated_at: now,
    created_at: now,
    name: "",
    description: "",
    num_portfolio_managers: 0,
    num_task_orders: 0,
    num_applications: 0,
    num_environments: 0,
  },
  {
    id: uuidv4(),
    // status: ProvisioningStatus.NOT_STARTED,
    updated_at: now,
    created_at: now,
    name: "",
    description: "",
    num_portfolio_managers: 0,
    num_task_orders: 0,
    num_applications: 0,
    num_environments: 0,
  },
  {
    id: uuidv4(),
    status: ProvisioningStatus.NOT_STARTED,
    // updated_at: now,
    created_at: now,
    name: "",
    description: "",
    num_portfolio_managers: 0,
    num_task_orders: 0,
    num_applications: 0,
    num_environments: 0,
  },
  {
    id: uuidv4(),
    status: ProvisioningStatus.NOT_STARTED,
    updated_at: now,
    // created_at: now,
    name: "",
    description: "",
    num_portfolio_managers: 0,
    num_task_orders: 0,
    num_applications: 0,
    num_environments: 0,
  },
  {
    id: uuidv4(),
    status: ProvisioningStatus.NOT_STARTED,
    updated_at: now,
    created_at: now,
    // name: "",
    description: "",
    num_portfolio_managers: 0,
    num_task_orders: 0,
    num_applications: 0,
    num_environments: 0,
  },
  {
    id: uuidv4(),
    status: ProvisioningStatus.NOT_STARTED,
    updated_at: now,
    created_at: now,
    name: "",
    // description: "",
    num_portfolio_managers: 0,
    num_task_orders: 0,
    num_applications: 0,
    num_environments: 0,
  },
  {
    id: uuidv4(),
    status: ProvisioningStatus.NOT_STARTED,
    updated_at: now,
    created_at: now,
    name: "",
    description: "",
    // num_portfolio_managers: 0,
    num_task_orders: 0,
    num_applications: 0,
    num_environments: 0,
  },
  {
    id: uuidv4(),
    status: ProvisioningStatus.NOT_STARTED,
    updated_at: now,
    created_at: now,
    name: "",
    description: "",
    num_portfolio_managers: 0,
    // num_task_orders: 0,
    num_applications: 0,
    num_environments: 0,
  },
  {
    id: uuidv4(),
    status: ProvisioningStatus.NOT_STARTED,
    updated_at: now,
    created_at: now,
    name: "",
    description: "",
    num_portfolio_managers: 0,
    num_task_orders: 0,
    // num_applications: 0,
    num_environments: 0,
  },
  {
    id: uuidv4(),
    status: ProvisioningStatus.NOT_STARTED,
    updated_at: now,
    created_at: now,
    name: "",
    description: "",
    num_portfolio_managers: 0,
    num_task_orders: 0,
    num_applications: 0,
    // num_environments: 0,
  },
];
