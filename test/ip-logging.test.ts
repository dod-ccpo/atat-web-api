import middy from "@middy/core";
import { Context } from "aws-lambda";
import { IpCheckerMiddleware } from "../utils/middleware/ip-logging";

describe("Test console logging", function () {
  it("should console log the event", async () => {
    const request: any = {
      body: {},
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
