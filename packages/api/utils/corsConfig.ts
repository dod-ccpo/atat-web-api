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
export const CORS_CONFIGURATION: Options = {
  origin: "*",
  headers: "*",
  methods: "*",
};
