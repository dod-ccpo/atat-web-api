import { CostRequest, CspRequestType, CspRequest } from "../../models/cost-jobs";
import { ProvisionRequest } from "../../models/provisioning-jobs";
import { getConfiguration } from "../provision/csp-configuration";
import { getToken } from "../../idp/client";
import { logger } from "../../utils/logging";
import axios from "axios";
import { Network } from "../../models/cloud-service-providers";

export interface CspResponse {
  code: number;
  content: {
    response: object;
    request: CostRequest | ProvisionRequest;
  };
}

export const costPayload: CspResponse = {
  code: 200,
  content: {
    request: {
      requestId: "21f9b7182f501110e58359a72799b6d3",
      portfolioId: "3146a650-a9bd-491d-b34b-a59a1adc048d",
      targetCsp: {
        name: "Demo Consume Response CSP_A",
        uri: "https://www.example.com/api/atat",
        network: Network.NETWORK_1,
      },
      startDate: "2022-06-15",
      endDate: "2022-06-24",
    },
    response: {
      task_orders: [
        {
          task_order_number: "9999999999999",
          clins: [
            {
              clin_number: "0001",
              actual: [
                {
                  total: "50.00",
                  results: [
                    {
                      month: "2021-12",
                      value: "20.00",
                    },
                    {
                      month: "2022-01",
                      value: "30.00",
                    },
                  ],
                },
              ],
              forecast: [
                {
                  total: "100.00",
                  results: [
                    {
                      month: "2022-02",
                      value: "100.00",
                    },
                  ],
                },
              ],
            },
            {
              clin_number: "0002",
              actual: [
                {
                  total: "750.00",
                  results: [
                    {
                      month: "2021-12",
                      value: "50.00",
                    },
                    {
                      month: "2022-01",
                      value: "700.00",
                    },
                  ],
                },
              ],
              forecast: [
                {
                  total: "1000.00",
                  results: [
                    {
                      month: "2022-02",
                      value: "100.00",
                    },
                    {
                      month: "2022-03",
                      value: "900.00",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

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

    // TODO: Revert immediately after demoing. This is simply a back
    // up to provide incase the mock server is not ready in time for
    // demoing. This will allow CSP_A to respond with properly
    // formatted cost data to be processed in SNOW.
    // Only CSP_Mock has a csp config and provides a baseUrl so
    // all other CSP enter this block.
    if (targetCsp.name === "CSP_A") {
      return costPayload;
    }

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
