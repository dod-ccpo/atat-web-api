export enum ErrorCode {
  INVALID_INPUT = "INVALID_INPUT",
  OTHER = "OTHER",
}

export interface ErrorModel {
  code: ErrorCode;
  message: string;
}

export interface ValidationErrorModel extends ErrorModel {
  code: ErrorCode.INVALID_INPUT;
  error_map: Record<string, unknown>;
}
