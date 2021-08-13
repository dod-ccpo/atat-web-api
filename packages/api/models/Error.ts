export enum ErrorCodes {
  INVALID_INPUT = "INVALID_INPUT",
  OTHER = "OTHER",
}

export interface Error {
  code: string;
  message: string;
}

export interface ValidationError extends Error {
  errorMap: Record<string, any>;
}
