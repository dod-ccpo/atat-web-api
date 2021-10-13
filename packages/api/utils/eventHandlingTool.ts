import { APIGatewayProxyEvent } from "aws-lambda";

interface ParsedBodyType<T> {
  body: T;
}
export type ApiGatewayEventParsed<T> = APIGatewayProxyEvent & ParsedBodyType<T>;
