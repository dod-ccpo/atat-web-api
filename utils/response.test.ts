import {
  Error,
  ErrorCode,
  OtherErrorResponse,
  ErrorStatusCode,
  NoContentResponse,
  ApiSuccessResponse,
  SuccessStatusCode,
  ApiBase64SuccessResponse,
} from "./response";

describe("Validation for No Content responses", () => {
  const exampleResponse = new NoContentResponse();
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
    const sampleError: Error = { code: ErrorCode.OTHER, message: "Test Error" };
    const errorResponse = new OtherErrorResponse(sampleError.message, ErrorStatusCode.INTERNAL_SERVER_ERROR);
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
    const okResponse = new ApiSuccessResponse(object);
    expect(JSON.parse(okResponse.body)).toEqual(object);
    const okBase64Response = new ApiBase64SuccessResponse(object);
    expect(JSON.parse(okBase64Response.body)).toEqual(object);
    const acceptedResponse = new ApiSuccessResponse(object, SuccessStatusCode.ACCEPTED);
    expect(JSON.parse(acceptedResponse.body)).toEqual(object);
  });
});

describe("Validate header handling", () => {
  it("should not delete headers", async () => {
    const successObject = { test: "object" };
    const headers = {
      "Content-Type": "application/json",
      "X-Test-Header": "testing code",
    };
    const successResponse = new ApiSuccessResponse(successObject, SuccessStatusCode.OK, headers);
    expect(successResponse.headers).not.toEqual(undefined);
    expect(successResponse.headers).not.toEqual(null);
    // This assertion is safe because we've already asserted through the previous
    // tests that the input is not undefined/null (which is an assumption of this
    // class that should hold). If this turns out to not be valid, then the test
    // should fail regardless.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const responseHeaderKeys = Object.keys(successResponse.headers!);
    Object.keys(headers).forEach((header) => expect(responseHeaderKeys).toContain(header));
  });
});
