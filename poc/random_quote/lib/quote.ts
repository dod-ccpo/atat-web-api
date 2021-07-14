export interface Quote {
  text: string;
  from: string;
}

export function isQuote(object: any): object is Quote {
  return "text" in object && "from" in object;
}

export function missingQuoteField(object: any): string {
  if (isQuote(object)) {
    return undefined;
  }
  return ["text", "from"].find((key) => !(key in object));
}
