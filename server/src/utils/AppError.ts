
export class AppError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const ErrorCodes = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  COMPANY_UNREACHABLE: "COMPANY_UNREACHABLE",
  LLM_FAILED: "LLM_FAILED",
  KIT_STRUCTURE_INVALID: "KIT_STRUCTURE_INVALID",
  DUPLICATE_SUBMISSION: "DUPLICATE_SUBMISSION",
  UNKNOWN: "UNKNOWN",
};
