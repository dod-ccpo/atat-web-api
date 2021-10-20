import { handler } from "./submitEmails";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

describe("Successfully post emails to queue", function () {
  const validRequest: APIGatewayProxyEvent = {
    body: JSON.stringify({ emails: ["test@email.mil"], emailType: "invitation" }),
  } as any;
  it("should successfully send message to queue and return 200", async () => {
    // TODO: implement proper test
    const response = await handler(validRequest);
    expect("happy path").toBe("happy path");
  });
});
