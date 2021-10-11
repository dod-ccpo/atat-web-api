import middy from "@middy/core";
import Ajv from "ajv";
import createError from "http-errors";
import { Schema } from "@middy/validator/node_modules/ajv";
import addFormats from "ajv-formats";

export const customMiddleware = (options: { inputSchema?: Schema } = {}) => {
  const before: middy.MiddlewareFn<any, any> = async (request) => {
    const ajv = new Ajv();
    addFormats(ajv);

    const validate = ajv.compile(options.inputSchema!);

    const valid = validate(request.event);
    if (!valid) {
      // Bad Request
      const error = createError(400, "Validation Failed");
      // console.log("Inside if valid ");
      request.event.headers = { ...request.event.headers };
      error.error_map = validate.errors;
      error.code = "INVALID_INPUT";
      throw error;
    }
  };

  return {
    before,
  };
};
