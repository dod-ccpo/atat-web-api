import { CostRequest } from "../../models/cost-jobs";
import { CspResponse } from "../../models/provisioning-jobs";
import { getConfiguration } from "../provision/csp-configuration";
import { getToken } from "../../idp/client";
import { logger } from "../../utils/logging";
import axios from "axios";

/**
 * Make a request to an actual CSP implementation of the ATAT API
 *
 * @param request The input provisioning request
 * @returns the response from the CSP
 */
export async function cspRequest(request: CostRequest): Promise<CspResponse> {
  const baseUrl = (await getConfiguration(request.targetCsp.name))?.uri;
  const url = `${baseUrl}/portfolios/${request.portfolioId}/cost`;
  if (!baseUrl || !baseUrl.startsWith("https://")) {
    logger.error("Invalid CSP configuration (Demo)", {
      input: {
        csp: request.targetCsp.name,
      },
      resolvedUrl: url,
      configSecretPath: process.env.CSP_CONFIG_SECRET_NAME,
    });
    return {
      code: 400,
      content: {
        details: "Invalid CSP provided",
      },
    };
  }

  const response = await axios.post(url, request, {
    headers: {
      Authorization: `Bearer ${(await getToken()).access_token}`,
      "User-Agent": "ATAT v0.2.0 client",
    },
    // Don't throw an error on non-2xx/3xx status code (let us handle it)
    validateStatus() {
      return true;
    },
  });

  if (response.status !== 200 && response.status !== 202) {
    logger.error("Request to CSP failed", {
      csp: request.targetCsp.name,
      request: {
        csp: request.targetCsp.name,
        url,
      },
      response: { statusCode: response.status, body: response.data },
    });
  }

  return {
    code: response.status,
    content: response.data,
  };
}
