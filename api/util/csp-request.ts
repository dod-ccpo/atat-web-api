import { logger } from "../../utils/logging";
import { ProvisioningStatusType } from "../client";

// This is merely a stop gap to provide mock responses
// this should be removed shortly and is not meant as a true representation
// of the different provisioning actions that can be performed with the
// async Csp request client and transformed into the CspResponse interface above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mockCspClientResponse(request: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let response: any;
  switch (request.targetCspName) {
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
        location: "https://cspB.example.com/v1/",
        status: {
          status: ProvisioningStatusType.SUCCESS,
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
        location: "https://cspC.example.com/v1/",
        status: {
          status: ProvisioningStatusType.FAILURE,
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
        location: "https://cspF.example.com/v1/",
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
