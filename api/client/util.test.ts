import { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  camelCaseObject,
  snakeCaseObject,
  camelToSnakeRequestInterceptor,
  snakeToCamelResponseInterceptor,
} from "./util";

// NOTE: The objects in this file are terrible examples of naming and structuring for objects.
// These are intended to be contrived examples for the purposes of transforming object keys from
// snake case to camel case (and vice-versa) and so nearly all of them are meant to be two
// words. Any refactoring to the naming should keep this goal in mind.

describe("base object transforms", () => {
  it("converts and round-trips a flat object", () => {
    const snakeObject = { snake_one: "A", snake_two: "B", snake_three: "C" };
    const camelObject = { snakeOne: "A", snakeTwo: "B", snakeThree: "C" };
    expect(camelCaseObject(snakeObject)).toEqual(camelObject);
    expect(snakeCaseObject(camelObject)).toEqual(snakeObject);
    expect(snakeCaseObject(camelCaseObject(snakeObject))).toEqual(snakeObject);
  });
  it("converts and round-trips a nested object", () => {
    const snakeObject = {
      its_name: "Noodle",
      snake_features: {
        head_to_tail: "big",
        the_teeth: "pointy",
      },
    };
    const camelObject = {
      itsName: "Noodle",
      snakeFeatures: {
        headToTail: "big",
        theTeeth: "pointy",
      },
    };
    expect(camelCaseObject(snakeObject)).toEqual(camelObject);
    expect(snakeCaseObject(camelObject)).toEqual(snakeObject);
    expect(snakeCaseObject(camelCaseObject(snakeObject))).toEqual(snakeObject);
  });
  it("converts and round-trips an array of objects", () => {
    const snakeArray = [{ snake_name: "Noodle" }, { snake_name: "Slider" }, { snake_name: "Snek" }];
    const camelArray = [{ snakeName: "Noodle" }, { snakeName: "Slider" }, { snakeName: "Snek" }];
    expect(camelCaseObject(snakeArray)).toEqual(camelArray);
    expect(snakeCaseObject(camelArray)).toEqual(snakeArray);
    expect(snakeCaseObject(camelCaseObject(snakeArray))).toEqual(snakeArray);
  });
  it("converts and round-trips an object with array values", () => {
    const snakeObject = {
      snake_name: "Noodle",
      favorite_snacks: [
        {
          snack_type: "egg",
          snack_color: "white",
        },
        {
          snack_type: "its tail",
          snack_color: "the snake",
        },
      ],
    };
    const camelObject = {
      snakeName: "Noodle",
      favoriteSnacks: [
        {
          snackType: "egg",
          snackColor: "white",
        },
        {
          snackType: "its tail",
          snackColor: "the snake",
        },
      ],
    };
    expect(camelCaseObject(snakeObject)).toEqual(camelObject);
    expect(snakeCaseObject(camelObject)).toEqual(snakeObject);
    expect(snakeCaseObject(camelCaseObject(snakeObject))).toEqual(snakeObject);
  });
});

describe("axios interceptors", () => {
  it("should convert requests from camelCase to snake_case", () => {
    expect(
      camelToSnakeRequestInterceptor({
        data: {
          hello_world: "Hello!",
        },
      } as InternalAxiosRequestConfig)
    ).toEqual({ data: { hello_world: "Hello!" } });
  });

  it("should convert responses from snake_case to camelCase", () => {
    const responseContentSnake = {
      test_object: {
        test_key: "test",
      },
    };
    const responseContentCamel = {
      testObject: {
        testKey: "test",
      },
    };
    const responseObject: AxiosResponse = {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "application/json",
      },
      data: null,
      config: {} as InternalAxiosRequestConfig,
    };
    expect(snakeToCamelResponseInterceptor({ ...responseObject, data: responseContentSnake })).toEqual({
      ...responseObject,
      data: responseContentCamel,
    });
  });

  it("should convert snake_case to camelCase for application/json; charset=UTF-8 content-type", () => {
    const response = {
      status: 200,
      statusText: "OK",
      data: { snake_case_key: "value" },
      headers: { "content-type": "application/json; charset=UTF-8" },
      config: {} as InternalAxiosRequestConfig,
    };
    const result = snakeToCamelResponseInterceptor(response);
    expect(result.data).toEqual({ snakeCaseKey: "value" });
  });

  it("should handle responses with no data", () => {
    const response = {
      status: 200,
      statusText: "OK",
      data: undefined,
      headers: { "content-type": "application/json" },
      config: {} as InternalAxiosRequestConfig,
    };
    const result = snakeToCamelResponseInterceptor(response);
    expect(result.data).toBeUndefined();
  });

  it("should not modify non-JSON response objects", () => {
    const responseObject: AxiosResponse = {
      status: 200,
      statusText: "OK",
      headers: {},
      data: "Test Response",
      config: {} as InternalAxiosRequestConfig,
    };
    expect(snakeToCamelResponseInterceptor(responseObject)).toEqual(responseObject);
  });
});
