import axios from "axios";
import { ClientError } from "graphql-request";

export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "GRAPHQL_ERROR"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR";

export class ApiError extends Error {
  statusCode: number;
  code: ApiErrorCode;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode = 500,
    code: ApiErrorCode = "UNKNOWN_ERROR",
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  // Handle GraphQL Request ClientError
  if (error instanceof ClientError) {
    const status = error.response.status || 500;
    const gqlErrors = error.response.errors || [];
    const firstError = gqlErrors[0];
    const message = firstError?.message || error.message || "A GraphQL error occurred.";
    const extensionCode = firstError?.extensions?.code as string | undefined;

    let code: ApiErrorCode = "GRAPHQL_ERROR";
    if (status === 401 || extensionCode === "UNAUTHENTICATED") {
      code = "UNAUTHORIZED";
    } else if (status === 403 || extensionCode === "FORBIDDEN") {
      code = "FORBIDDEN";
    } else if (status === 404) {
      code = "NOT_FOUND";
    } else if (status === 400 || extensionCode === "BAD_USER_INPUT") {
      code = "VALIDATION_ERROR";
    } else if (status >= 500) {
      code = "SERVER_ERROR";
    }

    const fieldErrors = firstError?.extensions?.errors as Record<string, string[]> | undefined;
    return new ApiError(message, status, code, fieldErrors);
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiError(
        error.message || "Network error. Please check your connection.",
        0,
        "NETWORK_ERROR"
      );
    }

    const status = error.response.status;
    const data = error.response.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    const message = data?.message || error.message || "An unexpected error occurred.";

    let code: ApiErrorCode = "UNKNOWN_ERROR";
    switch (status) {
      case 400:
        code = "BAD_REQUEST";
        break;
      case 401:
        code = "UNAUTHORIZED";
        break;
      case 403:
        code = "FORBIDDEN";
        break;
      case 404:
        code = "NOT_FOUND";
        break;
      case 409:
        code = "CONFLICT";
        break;
      case 422:
        code = "VALIDATION_ERROR";
        break;
      case 429:
        code = "RATE_LIMITED";
        break;
      case 500:
      case 502:
      case 503:
        code = "SERVER_ERROR";
        break;
      default:
        code = "UNKNOWN_ERROR";
    }

    return new ApiError(message, status, code, data?.errors);
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 500, "UNKNOWN_ERROR");
  }

  return new ApiError("An unknown error occurred", 500, "UNKNOWN_ERROR");
}

export function getApiErrorMessage(error: unknown): string {
  return parseApiError(error).message;
}

