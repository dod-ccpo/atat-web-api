import { Context } from "aws-lambda";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import { handler } from "./getFundingStep";
import { DynamoDBDocumentClient, GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { FundingStep, ValidationMessage } from "../../models/FundingStep";
import { mockClient } from "aws-sdk-client-mock";
import { v4 as uuidv4 } from "uuid";
import { DATABASE_ERROR, NO_SUCH_FUNDING_STEP, NO_SUCH_PORTFOLIO_DRAFT_404 } from "../../utils/errors";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const emptyRequest: ApiGatewayEventParsed<FundingStep> = {} as any;
const mockFundingStep: FundingStep = {
  task_orders: [
    {
      task_order_file: {
        name: "dummy.pdf",
        id: "134dfe66-f9fc-4f2e-9f39-b6f7e53e543a",
      },
      clins: [
        {
          idiq_clin: "IDIQ CLIN 0002 Classified IaaS/PaaS",
          clin_number: "0091",
          pop_start_date: "2019-10-05",
          pop_end_date: "2021-12-28",
          total_clin_value: 9131,
          obligated_funds: 1477,
        },
      ],
      task_order_number: "8787878787878999",
    },
  ],
};
const validRequest: ApiGatewayEventParsed<FundingStep> = {
  pathParameters: { portfolioDraftId: uuidv4() },
  body: "",
} as any;
it("should return generic Error if exception caught", async () => {
  jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
  ddbMock.on(GetCommand).rejects("Some error occurred");
  const result = await handler(validRequest, {} as Context, () => null);
  console.log(JSON.stringify(result));
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(DATABASE_ERROR);
  expect(result?.statusCode).toEqual(ErrorStatusCode.INTERNAL_SERVER_ERROR);
});
it("should require path param/ reject non UUIDv4 portfolioDraftIds", async () => {
  const result = await handler(emptyRequest, {} as Context, () => null);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT_404);
  expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
});

it("should return error if portfolio draft does not exist", async () => {
  const emptyOutput: GetCommandOutput = {} as any;
  ddbMock.on(GetCommand).resolves(emptyOutput);
  const result = await handler(validRequest, {} as Context, () => null);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT_404);
  expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
  const responseBody = JSON.parse(result?.body ?? "");
  expect(responseBody.message).toMatch("Portfolio Draft with the given ID does not exist");
});
it("should return error if the funding step does not exist in portfolio draft", async () => {
  const itemOutput: GetCommandOutput = { Item: {} } as any;
  ddbMock.on(GetCommand).resolves(itemOutput);
  const result = await handler(validRequest, {} as Context, () => null);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(NO_SUCH_FUNDING_STEP);
  expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
  const responseBody = JSON.parse(result?.body ?? "");
  expect(responseBody.message).toMatch("Funding Step not found for this Portfolio Draft");
});

it("should return the funding step", async () => {
  const fundingStepOutput: GetCommandOutput = { Item: { funding_step: {} } } as any;
  ddbMock.on(GetCommand).resolves(fundingStepOutput);
  const result = await handler(validRequest, {} as Context, () => null);
  expect(result).toBeInstanceOf(ApiSuccessResponse);
  expect(result?.statusCode).toEqual(SuccessStatusCode.OK);
  expect(result?.body).toEqual(JSON.stringify({}));
});
it("should return the funding step with sample data", async () => {
  const fullFundingStepOutput: GetCommandOutput = { Item: { funding_step: mockFundingStep } } as any;
  ddbMock.on(GetCommand).resolves(fullFundingStepOutput);
  const result = await handler(validRequest, {} as Context, () => null);
  expect(result?.body).toStrictEqual(JSON.stringify(mockFundingStep));
});
