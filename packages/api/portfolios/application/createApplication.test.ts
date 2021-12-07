import { handler } from "../application/createApplication";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";

const validRequest: ApiGatewayEventParsed<any> = {
  body: { name: "1740test", description: "1740test", environments: [{ name: "Scrimblo Environment" }] },
  pathParameters: { portfolioId: "b148645b-7c71-4d05-af76-dc1f1505506a" },
} as any;

describe("Successful operation tests", () => {
  it("should return funding step and http status code 201", async () => {
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result);
    expect(result).toBeInstanceOf(ApiSuccessResponse);
    expect(result?.statusCode).toEqual(SuccessStatusCode.CREATED);
    const responseBody = JSON.parse(result?.body ?? "");
    console.log(responseBody);
    // expect(responseBody.name).toStrictEqual("scrable");
    /*
    expect(result?.body).toStrictEqual(JSON.stringify(mockFundingStep));
    const responseBody = JSON.parse(result?.body ?? "");
    const numOfTaskOrders = responseBody.task_orders.length;
    expect(numOfTaskOrders).toBe(mockResponse.num_task_orders); */
  });
});
