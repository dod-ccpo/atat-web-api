import { CostRequest, CspRequestType, CspRequest } from "../../models/cost-jobs";
import { ProvisionRequest } from "../../models/provisioning-jobs";
import { getConfiguration } from "../provision/csp-configuration";
import { getToken } from "../../idp/client";
import { logger } from "../../utils/logging";
import axios from "axios";

export interface CspResponse {
  code: number;
  content: {
    response: object;
    request: CostRequest | ProvisionRequest;
  };
}

/**
 * Make a request to an actual CSP implementation of the ATAT API
 *
 * @param request The input request (e.g., provisioning, cost)
 * @returns the response from the CSP
 */
export async function cspRequest(request: CspRequestType<CostRequest | ProvisionRequest>): Promise<CspResponse> {
  if (!request.body) {
    return {
      code: 400,
      content: {
        response: { details: "No request body provided" },
        request: request.body,
      },
    };
  }
  const { targetCsp, portfolioId } = request.body;

  if (!targetCsp || !portfolioId) {
    logger.error("Request to CSP failed", { input: { targetCsp, portfolioId } });
    return {
      code: 400,
      content: {
        response: { details: "No Target CSP or the Portfolio Id is not provided." },
        request: request.body,
      },
    };
  }
  const baseUrl = (await getConfiguration(targetCsp.name))?.uri;
  let url: string;

  switch (request.requestType) {
    case CspRequest.PROVISION:
      url = `${baseUrl}/portfolios`;
      break;
    case CspRequest.COST:
      url = `${baseUrl}/portfolios/${portfolioId}/cost`;
      break;
  }

  if (!baseUrl || !baseUrl.startsWith("https://")) {
    logger.error("Invalid CSP configuration", {
      input: {
        csp: targetCsp.name,
      },
      resolvedUrl: url,
      configSecretPath: process.env.CSP_CONFIG_SECRET_NAME,
    });
    return {
      code: 400,
      content: {
        response: { details: "Invalid CSP provided" },
        request: request.body,
      },
    };
  }

  const response = await axios.post(url, request.body, {
    headers: {
      Authorization: `Bearer ${(await getToken()).access_token}`,
      "User-Agent": "ATAT v0.2.0 client",
    },
    // Don't throw an error on non-2xx/3xx status code (let us handle it)
    validateStatus() {
      return true;
    },
  });

  if (![200, 202].includes(response.status)) {
    logger.error("Request to CSP failed", {
      csp: targetCsp.name,
      request: {
        csp: targetCsp.name,
        url,
      },
      response: { statusCode: response.status, body: response.data },
    });
  }

  return {
    code: response.status,
    content: { response: response.data, request: request.body },
  };
}
