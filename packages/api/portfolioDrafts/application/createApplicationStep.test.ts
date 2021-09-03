import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { ApplicationStep } from "../../models/ApplicationStep";
import { AccessLevel } from "../../models/AccessLevel";
import { handler } from "./createApplicationStep";
import { ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../../utils/response";
import { isApplicationStep } from "../../utils/validation";
import { NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_INVALID } from "../../utils/errors";
import { ErrorCodes } from "../../models/Error";
import cloneDeep from "lodash.clonedeep";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

// NOTE: consider moving this to a shared location so that other tests can use it
const emptyEvent: APIGatewayProxyEvent = {
  body: "",
  headers: {},
  httpMethod: "",
  isBase64Encoded: false,
  path: "",
  pathParameters: {},
  queryStringParameters: null,
  stageVariables: {},
  requestContext: {} as never,
  resource: "",
  multiValueHeaders: {},
  multiValueQueryStringParameters: {},
};

const mockPortfolioDraftId = "12345a67-b89c-01d2-ef34-5678901ab234";

const applicationStepMinimal: ApplicationStep = {
  name: "app name",
  description: "app desc",
  environments: [
    {
      name: "env 1 name",
      operators: [
        {
          access: AccessLevel.ADMINISTRATOR,
          email: "valid.email@foo.com",
          first_name: "Homer",
          last_name: "Simpson",
        },
      ],
    },
  ],
};

describe("Successful operation tests", () => {
  const validRequest = cloneDeep(emptyEvent);
  validRequest.pathParameters = { portfolioDraftId: mockPortfolioDraftId };
  validRequest.body = JSON.stringify(applicationStepMinimal);

  beforeEach(() => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: applicationStepMinimal });
  });

  it("should return HTTP response status code 201 Created", async () => {
    const response = await handler(validRequest);
    expect(response.statusCode).toEqual(SuccessStatusCode.CREATED);
  });
  it("should return a response body that looks like a Funding Step", async () => {
    const response = await handler(validRequest);
    expect(isApplicationStep(JSON.parse(response.body))).toBeTruthy();
  });

  it.todo("should return status code 201");
  it.todo("should return response body that looks like an ApplicationStep");
});

describe("Invalid input tests", () => {
  it("should return status code 400 if body is not JSON", async () => {
    const request = cloneDeep(emptyEvent);
    request.pathParameters = { portfolioDraftId: mockPortfolioDraftId };
    request.body = "a string that is not JSON";
    expect(await handler(request)).toEqual(REQUEST_BODY_INVALID);
  });
  it("should return status code 400 if app name is too few characters", async () => {
    await doStringLengthTest("name", null, "a", /application name invalid/);
  });
  it("should return status code 400 if app name is too many characters", async () => {
    await doStringLengthTest(
      "name",
      null,
      "this is tooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo long",
      /application name invalid/
    );
  });
  it("should return status code 400 if environment name is too few characters", async () => {
    await doStringLengthTest("environments", "name", "a", /environment name invalid/);
  });
  it("should return status code 400 if environment name is too many characters", async () => {
    await doStringLengthTest(
      "environments",
      "name",
      "this is tooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo long",
      /environment name invalid/
    );
  });

  async function doStringLengthTest(appProperty: string, envProperty: string | null, value: string, message: RegExp) {
    const body = JSON.parse(JSON.stringify(applicationStepMinimal));
    if (envProperty) {
      body[appProperty][0][envProperty] = value;
    } else {
      body[appProperty] = value;
    }
    const request = cloneDeep(emptyEvent);
    request.pathParameters = { portfolioDraftId: mockPortfolioDraftId };
    request.body = JSON.stringify(body);

    const result = await handler(request);
    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result.body).code).toEqual(ErrorCodes.INVALID_INPUT);
    expect(JSON.parse(result.body).message).toMatch(message);
  }
});

describe("Portfolio Draft DNE tests", () => {
  it("should return status code 404 & error body with message 'Portfolio Draft with the given ID does not exist'", async () => {
    ddbMock.on(UpdateCommand).rejects({
      name: "ConditionalCheckFailedException",
    });
    const request = cloneDeep(emptyEvent);
    request.pathParameters = { portfolioDraftId: "invalid" };
    request.body = JSON.stringify(applicationStepMinimal);

    const result = await handler(request);
    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
    expect(result.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
    expect(JSON.parse(result.body).code).toEqual(ErrorCodes.INVALID_INPUT);
    expect(JSON.parse(result.body).message).toMatch(/Portfolio Draft with the given ID does not exist/);
  });
});
