import { SFN } from "@aws-sdk/client-sfn";
import { logger } from "../logging";
import { tracer } from "../tracing";

export const sfnClient = tracer.captureAWSv3Client(new SFN({ useFipsEndpoint: true, logger: logger as any }));
