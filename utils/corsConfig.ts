// temporary and incomplete cors configuration
export const CORS_CONFIGURATION = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*",
};

interface Options {
  credentials?: boolean | string;
  headers?: string;
  methods?: string;
  origin?: string;
  origins?: string[];
  exposeHeaders?: string;
  maxAge?: number | string;
  requestHeaders?: string;
  requestMethods?: string;
  cacheControl?: string;
}

// TODO(AT-6712): limit the origin(s) permitted by CORS policy
export const MIDDY_CORS_CONFIGURATION: Options = {
  origin: "*",
  headers: "*",
  methods: "*",
};
