import { Error, ErrorCodes } from "../models/Error";
import * as response from "./response";

describe("Validation for No Content responses", () => {
  const exampleResponse = new response.NoContentResponse();
  // The value 204 is specified by the HTTP specification
  it("should have a status code of 204", async () => {
    expect(exampleResponse.statusCode).toEqual(204);
  });
  // It would be invalid to return a 204 with a body. The client
  // must ignore any body on a 204 response
  it("should have an empty body", async () => {
    expect(exampleResponse.body).toEqual("");
  });
});

describe("Validate parsing results in the same object", () => {
  it("should result in the same error after parsing", async () => {
    const sampleError: Error = { code: ErrorCodes.OTHER, message: "Test Error" };
    const errorResponse = new response.ErrorResponse(
      sampleError.message,
      response.ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
    expect(JSON.parse(errorResponse.body)).toEqual(sampleError);
  });

  // We have experienced issues where an object gets double-stringified. Parsing the response
  // once should result in the same item being returned.
  it("should return an identical object generally after parsing", async () => {
    const object = {
      a: 1,
      b: "2",
      c: ["1", "2", "3", "foo"],
      foo: {
        bar: true,
        baz: false,
      },
    };
    const okResponse = new response.ApiSuccessResponse(object);
    expect(JSON.parse(okResponse.body)).toEqual(object);
    const acceptedResponse = new response.ApiSuccessResponse(object, response.SuccessStatusCode.ACCEPTED);
    expect(JSON.parse(acceptedResponse.body)).toEqual(object);
  });
});

describe("Validate header handling", () => {
  it("should not modify headers", async () => {
    const successObject = { test: "object" };
    const headers = {
      "Content-Type": "application/json",
      "X-Test-Header": "testing code",
    };
    const successResponse = new response.ApiSuccessResponse(successObject, response.SuccessStatusCode.OK, headers);
    expect(successResponse.headers).toEqual(headers);
  });
});
