import { APPLICATION_STEP, FUNDING_STEP, PORTFOLIO_STEP } from "./PortfolioDraft";
import { exhaustivePick } from "./TypeFields";
import { mockPortfolioDraft } from "../portfolioDrafts/commonPortfolioDraftMockData";
import { portfolioDraftSummaryProperties } from "./PortfolioDraftSummary";

describe("Test object trimming", () => {
  it("should not have extra attributes", async () => {
    const trimmed = exhaustivePick(mockPortfolioDraft, portfolioDraftSummaryProperties);
    expect(trimmed).not.toHaveProperty(PORTFOLIO_STEP);
    expect(trimmed).not.toHaveProperty(FUNDING_STEP);
    expect(trimmed).not.toHaveProperty(APPLICATION_STEP);
  });
  it("should contain all required attributes", async () => {
    const trimmed = exhaustivePick(mockPortfolioDraft, portfolioDraftSummaryProperties);
    Object.keys(portfolioDraftSummaryProperties).forEach((key) => {
      expect(trimmed).toHaveProperty(key);
    });
  });
});
