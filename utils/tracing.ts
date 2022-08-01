import { Tracer } from "@aws-lambda-powertools/tracer";

const baseTracer = new Tracer({
  serviceName: process.env.POWERTOOLS_SERVICE_NAME ?? "ATAT",
  captureHTTPsRequests: true,
  enabled: true,
});

export const tracer = baseTracer;
