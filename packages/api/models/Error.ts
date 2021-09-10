export enum ErrorCode {
  INVALID_INPUT = "INVALID_INPUT",
  OTHER = "OTHER",
}

export interface Error {
  code: ErrorCode;
  message: string;
}

export interface ValidationError extends Error {
  code: ErrorCode.INVALID_INPUT;
  error_map: Record<string, unknown>;
}
