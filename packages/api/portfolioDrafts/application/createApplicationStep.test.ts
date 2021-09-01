import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const validRequest: APIGatewayProxyEvent = {
  pathParameters: { portfolioDraftId: "1234" },
  // body { mockApplicationStep },
} as any;

describe("Successful operation tests", () => {
  it.todo("should return status code 201");
  it.todo("should return response body that looks like an ApplicationStep");
});
describe("Invalid input tests", () => {
  it.todo("should return status code 400");
  it.todo("should return ValidationError");
});
describe("Portfolio Draft DNE tests", () => {
  it.todo("should return status code 404");
  it.todo("should return body containing message 'Portfolio Draft with the given ID does not exist'");
});

// responses:
// '201':
//   description: Successful operation
//   content:
//     application/json:
//       schema:
//         $ref: '#/components/schemas/ApplicationStep'
//       examples:
//           ApplicationStepEx:
//             $ref: '#/components/examples/ApplicationStepEx'
// '400':
//   description: Invalid input
//   content:
//     application/json:
//       schema:
//         $ref: '#/components/schemas/ValidationError'
// '404':
//   description: Portfolio Draft with the given ID does not exist
