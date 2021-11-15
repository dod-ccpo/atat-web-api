import { IpCheckerMiddleware } from "./ipLogging";

describe("Test console logging", function () {
  it("should console log the event", async () => {
    const consoleLogSpy = jest.spyOn(console, "log");
    IpCheckerMiddleware();
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
