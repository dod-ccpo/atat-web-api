import middy from "@middy/core";
import xssSanitizer from "../utils/middleware/xss-sanitizer";

describe("Useable with middy", () => {
  it("custom 'before' middleware can be attached with middys 'use'", async () => {
    const handler = middy();
    const middleware = xssSanitizer();
    expect(handler.__middlewares.before[0]).not.toBeDefined();
    handler.use(middleware);
    expect(handler.__middlewares.before[0]).toBeDefined();
  });
});
