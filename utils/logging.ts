import { Logger, LogFormatter } from "@aws-lambda-powertools/logger";
import { LogAttributes, UnformattedAttributes } from "@aws-lambda-powertools/logger/lib/types";

type AtatLog = LogAttributes;

class AtatLogFormatter extends LogFormatter {
  public formatAttributes(attributes: UnformattedAttributes): AtatLog {
    return {
      timestamp: this.formatTimestamp(attributes.timestamp),
      logLevel: attributes.logLevel,
      message: attributes.message,
      region: attributes.awsRegion,
      correlationIds: {
        awsRequestId: attributes.lambdaContext?.awsRequestId,
        xRayTraceId: attributes.xRayTraceId,
      },
      service: {
        name: attributes.serviceName,
        environment: attributes.environment,
      },
      lambdaFunction: {
        name: attributes.lambdaContext?.functionName,
        arn: attributes.lambdaContext?.invokedFunctionArn,
        memoryLimitInMB: attributes.lambdaContext?.memoryLimitInMB,
        version: attributes.lambdaContext?.functionVersion,
        coldStart: attributes.lambdaContext?.coldStart,
      },
    };
  }
}

const baseLogger = new Logger({
  serviceName: process.env.POWERTOOLS_SERVICE_NAME ?? "ATAT",
  logFormatter: new AtatLogFormatter(),
});

export const logger = baseLogger;
export interface ILogger {
  debug(message?: any, ...params: any[]): void;
  info(message?: any, ...params: any[]): void;
  warn(message?: any, ...params: any[]): void;
  error(message?: any, ...params: any[]): void;
  [x: string]: any;
}
