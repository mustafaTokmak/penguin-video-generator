export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class APIError extends AppError {
  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message, "API_ERROR", statusCode, details);
    this.name = "APIError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests", retryAfter?: number) {
    super(message, "RATE_LIMIT_ERROR", 429, { retryAfter });
    this.name = "RateLimitError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

export function getErrorDetails(error: unknown): {
  message: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
} {
  if (isAppError(error)) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  return {
    message: getErrorMessage(error),
    statusCode: 500,
  };
}
