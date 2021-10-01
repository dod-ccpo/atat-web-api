import { PortfolioDraft } from "./PortfolioDraft";
import { portfolioDraftFields } from "./PortfolioDraftSummary";
import { ProvisioningStatus } from "./ProvisioningStatus";
import { exhaustivePick } from "./TypeFields";

describe("Test object trimming", () => {
  const portfolioDraft: PortfolioDraft = {
    id: "test",
    name: "test",
    status: ProvisioningStatus.IN_PROGRESS,
    created_at: "",
    updated_at: "",
    num_task_orders: 0,
    num_environments: 0,
    num_applications: 0,
    num_portfolio_managers: 0,
    funding_step: {
      task_orders: [],
    },
    application_step: {
      applications: [],
    },
    portfolio_step: {
      name: "test",
      description: "test",
      dod_components: [],
      portfolio_managers: [],
    },
  };
  it("should not have extra attributes", async () => {
    const trimmed = exhaustivePick(portfolioDraft, portfolioDraftFields);
    expect(trimmed).not.toHaveProperty("funding_step");
    expect(trimmed).not.toHaveProperty("portfolio_step");
    expect(trimmed).not.toHaveProperty("application_step");
  });
  it("should contain all required attributes", async () => {
    const trimmed = exhaustivePick(portfolioDraft, portfolioDraftFields);
    Object.keys(portfolioDraftFields).forEach((key) => {
      expect(trimmed).toHaveProperty(key);
    });
  });
});
