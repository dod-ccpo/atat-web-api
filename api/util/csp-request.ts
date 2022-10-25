import { logger } from "../../utils/logging";
import { ProvisioningStatusType } from "../client";
export interface CspResponse<Req, Resp> {
  code: number;
  content: {
    request: Req;
    response: Resp;
  };
}

// This is merely a stop gap to provide mock responses
// this should be removed shortly and is not meant as a true representation
// of the different provisioning actions that can be performed with the
// async Csp request client and transformed into the CspResponse interface above
export function mockCspClientResponse(request: any) {
  let response: any;
  switch (request.targetCsp.name) {
    case "CSP_A":
      response = {
        status: {},
        $metadata: {
          status: 200,
          request,
        },
      };
      logger.info("Success Sync response", { response });
      return response;
    case "CSP_B":
      response = {
        location: request.targetCsp.uri,
        status: {
          status: ProvisioningStatusType.COMPLETE,
          portfolioId: request.portfolioId,
          provisioningJobId: request.jobId,
        },
        $metadata: {
          status: 202,
          request,
        },
      };
      logger.info("Success Async response - COMPLETE", { response });
      return response;
    case "CSP_C":
      response = {
        location: request.targetCsp.uri,
        status: {
          status: ProvisioningStatusType.FAILED,
          portfolioId: request.portfolioId,
          provisioningJobId: request.jobId,
        },
        $metadata: {
          status: 400,
          request,
        },
      };
      logger.error("Failed Async response - FAILED", { response });
      return response;
    case "CSP_D":
      response = {
        status: {},
        $metadata: {
          status: 500,
          request: { unknown: "response" },
        },
      };
      logger.error("Internal error response", { response });
      return response;
    case "CSP_E":
      response = {
        status: {},
        $metadata: {
          status: 404,
          request,
        },
      };
      logger.error("Invalid Request", { response });
      return response;
    case "CSP_F":
      response = {
        location: request.targetCsp.uri,
        status: {
          status: ProvisioningStatusType.IN_PROGRESS,
          portfolioId: request.portfolioId,
          provisioningJobId: request.jobId,
        },
        $metadata: {
          status: 202,
          request,
        },
      };
      logger.info("Success Async response - IN PROGRESS", { response });
      return response;
    default:
      logger.info(`${request.targetCsp.name} unknown response`, { response });
      return {
        status: {},
        $metadata: {
          status: 500,
          request: { unknown: "response" },
        },
      };
  }
}
