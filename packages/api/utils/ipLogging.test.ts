import middy from "@middy/core";
import { Context } from "aws-lambda";
import { validRequest } from "../portfolioDrafts/commonPortfolioDraftMockData";
import { mockPortfolioStep } from "../portfolioDrafts/portfolio/commonPortfolioMockData";
import { IpCheckerMiddleware } from "./ipLogging";

describe("Test console logging", function () {
  it("should console log the event", async () => {
    // const handler = middy();
    // const middleware = IpCheckerMiddleware()
    // const consoleLogSpy = jest.spyOn(console, "log");
    // IpCheckerMiddleware();
    // expect(consoleLogSpy).toHaveBeenCalled();
    const request: any = {
      validRequest,
      body: mockPortfolioStep,
      requestContext: { identity: { sourceIp: "10.2.2.2" } },
    };
    const baseHandler = (event: any) => {
      return event;
    };
    const consoleLogSpy = jest.spyOn(console, "log");
    const handler = middy(baseHandler).use(IpCheckerMiddleware());
    await handler(request, {} as Context, () => null);
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
