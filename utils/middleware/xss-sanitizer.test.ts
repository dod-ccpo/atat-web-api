import middy from "@middy/core";
import { Context } from "aws-lambda";
import xssSanitizer from "./xss-sanitizer";

describe("Useable with middy", () => {
  it("custom 'before' middleware can be attached with middys 'use'", async () => {
    const handler = middy();
    const middleware = xssSanitizer();
    handler.use(middleware);
    expect(
      JSON.stringify(await handler({ event: { body: { testContent: "<script>alert();</script>" } } }, {} as Context))
    ).toEqual(expect.not.stringContaining("script"));
  });
});
