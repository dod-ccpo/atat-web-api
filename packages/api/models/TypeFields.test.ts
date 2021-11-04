import { APPLICATION_STEP, FUNDING_STEP, PORTFOLIO_STEP } from "./PortfolioDraft";
import { ExhaustivePropertyMap, exhaustivePick } from "./TypeFields";
import { mockPortfolioDraft } from "../portfolioDrafts/commonPortfolioDraftMockData";
import { portfolioDraftSummaryProperties } from "./PortfolioDraftSummary";

describe("test object trimming with exhaustivePick()", () => {
  interface ParentObject {
    foo: number;
  }
  const parentObjectProperties: ExhaustivePropertyMap<ParentObject> = {
    foo: null,
  };
  interface ChildObject extends ParentObject {
    bar: number;
  }
  const childObj: ChildObject = { foo: 0, bar: 0 };
  const trimmedObj = exhaustivePick(childObj, parentObjectProperties);
  it("trimmed object should contain all required properties", async () => {
    Object.keys(parentObjectProperties).forEach((key) => {
      expect(trimmedObj).toHaveProperty(key);
    });
  });
  it("trimmed object should not have extra properties", async () => {
    expect(trimmedObj).not.toHaveProperty("bar");
  });
});

describe("test PortfolioDraftSummary type trimming with exhaustivePick()", () => {
  const trimmedObj = exhaustivePick(mockPortfolioDraft, portfolioDraftSummaryProperties);
  it("PortfolioDraftSummary object should contain all required attributes", async () => {
    Object.keys(portfolioDraftSummaryProperties).forEach((key) => {
      expect(trimmedObj).toHaveProperty(key);
    });
  });
  it("PortfolioDraftSummary object should not have extra attributes found in PortfolioDraft", async () => {
    expect(trimmedObj).not.toHaveProperty(PORTFOLIO_STEP);
    expect(trimmedObj).not.toHaveProperty(FUNDING_STEP);
    expect(trimmedObj).not.toHaveProperty(APPLICATION_STEP);
  });
});
