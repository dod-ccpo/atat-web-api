import { camelCase, snakeCase, mapKeys, mapValues, cloneDeep, isPlainObject, isArray, map, functions } from "lodash";
import axios, { Axios, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

/**
 * Deeply convert keys within an object to a given case (either snake_case or camelCase are
 * supported).
 */
function keysToCase(object: any, method: typeof camelCase | typeof snakeCase): any {
  let convertedObject = cloneDeep(object);
  if (isArray(convertedObject)) {
    return map(convertedObject, (obj) => keysToCase(obj, method));
  } else {
    convertedObject = mapKeys(convertedObject, (_value, key) => {
      return method(key);
    });
    return mapValues(convertedObject, (value) => {
      if (isPlainObject(value)) {
        return keysToCase(value, method);
      }
      if (isArray(value)) {
        return map(value, (obj) => keysToCase(obj, method));
      }
      return value;
    });
  }
}

export function camelCaseObject(object: any): any {
  return keysToCase(object, camelCase);
}

export function snakeCaseObject(object: any): any {
  return keysToCase(object, snakeCase);
}

// Dynamically convert all values to snake_case to send across the wire, per the API
// specification and then convert responses to camelCase for the internal API of this
// client.
export function snakeToCamelResponseInterceptor(response: AxiosResponse): AxiosResponse {
  if (response.data && response.headers?.["content-type"] === "application/json") {
    response.data = camelCaseObject(response.data);
  }
  return response;
}

export function camelToSnakeRequestInterceptor(config: AxiosRequestConfig): AxiosRequestConfig {
  const newConfig = { ...config };
  if (config.data) {
    newConfig.data = snakeCaseObject(config.data);
  }
  return newConfig;
}
