import { Context } from "aws-lambda";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import { DATABASE_ERROR, NO_SUCH_APPLICATION_STEP, NO_SUCH_PORTFOLIO_DRAFT } from "../../utils/errors";
import { DynamoDBDocumentClient, GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { mockApplicationStep } from "./commonApplicationMockData";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "./getApplicationStep";
import { v4 as uuidv4 } from "uuid";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { ApplicationStep } from "../../models/ApplicationStep";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const validRequest: ApiGatewayEventParsed<ApplicationStep> = {
  body: {},
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

it("should return generic Error if exception caught", async () => {
  jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
  ddbMock.on(GetCommand).rejects("Some error occurred");
  const result = await handler(validRequest, {} as Context, () => null);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(DATABASE_ERROR);
  expect(result?.statusCode).toEqual(ErrorStatusCode.INTERNAL_SERVER_ERROR);
});
it("should require path param", async () => {
  const emptyRequest: ApiGatewayEventParsed<ApplicationStep> = {} as any;
  const result = await handler(emptyRequest, {} as Context, () => null);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
});
it("should return error when path param not UUIDv4 (to avoid performing query)", async () => {
  const invalidRequest: ApiGatewayEventParsed<ApplicationStep> = {
    pathParameters: { portfolioDraftId: "invalid" },
  } as any;
  const result = await handler(invalidRequest, {} as Context, () => null);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
  expect(JSON.parse(result?.body ?? "").message).toMatch(/Portfolio Draft with the given ID does not exist/);
});
it("should return error if portfolio draft does not exist", async () => {
  const emptyOutput: GetCommandOutput = {} as any;
  ddbMock.on(GetCommand).resolves(emptyOutput);
  const result = await handler(validRequest, {} as Context, () => null);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
  expect(JSON.parse(result?.body ?? "").message).toMatch(/Portfolio Draft with the given ID does not exist/);
});
it("should return error if application step does not exist in portfolio draft", async () => {
  const itemOutput: GetCommandOutput = { Item: {} } as any;
  ddbMock.on(GetCommand).resolves(itemOutput);
  const result = await handler(validRequest, {} as Context, () => null);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(NO_SUCH_APPLICATION_STEP);
  expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
  expect(JSON.parse(result?.body ?? "").message).toMatch(/Application Step not found for this Portfolio Draft/);
});
it("should return application step", async () => {
  const appStepOutput: GetCommandOutput = { Item: { application_step: {} } } as any;
  ddbMock.on(GetCommand).resolves(appStepOutput);
  const result = await handler(validRequest, {} as Context, () => null);
  expect(result).toBeInstanceOf(ApiSuccessResponse);
  expect(result?.statusCode).toEqual(SuccessStatusCode.OK);
  expect(result?.body ?? "").toEqual(JSON.stringify({}));
});
it("should return application step with sample data", async () => {
  const fullAppStepOutput: GetCommandOutput = { Item: { application_step: mockApplicationStep } } as any;
  ddbMock.on(GetCommand).resolves(fullAppStepOutput);
  const result = await handler(validRequest, {} as Context, () => null);
  expect(result?.body ?? "").toStrictEqual(JSON.stringify(mockApplicationStep));
});
