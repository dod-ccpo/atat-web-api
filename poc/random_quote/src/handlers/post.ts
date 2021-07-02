import { Context, HttpRequest } from '@azure/functions';

export async function addQuote (context: Context, req: HttpRequest): Promise<void> {
  context.log('addQuote function triggered from http request.');

  if (req.body) {
    context.res = {
      body: "(mock) Added quote: " + JSON.stringify(req.body)
    };
  }
  else {
    context.res = {
      body: "No POST body"
    };
  }
}