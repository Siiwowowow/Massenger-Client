// src/lib/graphql/client.ts
import { GraphQLClient, type RequestDocument, type Variables } from "graphql-request";
import { env } from "@/config/env";
import { parseApiError } from "@/lib/api/api-error";
import type { GraphQLRequestOptions } from "./types";

/**
 * Resolves the GraphQL endpoint from environment configuration.
 */
export const getGraphQLEndpoint = (): string => {
  return env.client.NEXT_PUBLIC_GRAPHQL_URL;
};

/**
 * Creates an isolated GraphQLClient instance.
 * - In browser environments, default `credentials: "include"` is used to automatically forward cookies.
 * - In server environments (Next.js App Router RSC/Actions), explicit headers or cookie strings can be passed
 *   to avoid state leaking between requests.
 */
export const createGraphQLClient = (options?: {
  endpoint?: string;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  fetch?: typeof fetch;
}): GraphQLClient => {
  const endpoint = options?.endpoint || getGraphQLEndpoint();
  const isClient = typeof window !== "undefined";

  return new GraphQLClient(endpoint, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ? (typeof options.headers === "object" && !(options.headers instanceof Headers) ? options.headers : Object.fromEntries(new Headers(options.headers).entries())) : {}),
    },
    credentials: options?.credentials ?? (isClient ? "include" : "same-origin"),
    fetch: options?.fetch,
  });
};

/**
 * Shared client instance for browser-side requests.
 * Uses `credentials: "include"` for cookie authentication.
 */
export const graphqlClient: GraphQLClient = createGraphQLClient();

/**
 * Executes a GraphQL operation with strong TypeScript typing and unified error handling.
 *
 * @param document - GraphQL query or mutation string/DocumentNode
 * @param variables - Variables matching the GraphQL operation
 * @param options - Additional request headers, signal, or cache options
 * @returns Parsed GraphQL response data
 *
 * @example
 * ```ts
 * const data = await graphqlRequest<MyQueryData, MyQueryVariables>(MY_QUERY, { id: "123" });
 * ```
 */
export async function graphqlRequest<TData, TVariables extends Variables = Variables>(
  document: RequestDocument,
  variables?: TVariables,
  options?: GraphQLRequestOptions
): Promise<TData> {
  try {
    const client = options?.headers
      ? createGraphQLClient({ headers: options.headers, fetch: options.fetch })
      : graphqlClient;

    const requestHeaders: HeadersInit = {
      ...(options?.headers ? (typeof options.headers === "object" && !(options.headers instanceof Headers) ? options.headers : Object.fromEntries(new Headers(options.headers).entries())) : {}),
    };

    return await client.request<TData, TVariables>({
      document,
      variables: (variables ?? {}) as TVariables,
      requestHeaders,
      signal: options?.signal,
    } as unknown as Parameters<typeof client.request<TData, TVariables>>[0]);
  } catch (error) {
    throw parseApiError(error);
  }
}

/**
 * Factory for Server Components, Route Handlers, and Server Actions.
 * Attaches request-specific cookies/headers to prevent state leakage across requests.
 *
 * @param cookieHeader - Optional cookie string (e.g. from `(await cookies()).toString()`)
 * @param customHeaders - Optional additional server-side headers
 */
export function getServerGraphQLClient(cookieHeader?: string, customHeaders?: HeadersInit): GraphQLClient {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }

  if (customHeaders) {
    const extra = new Headers(customHeaders);
    extra.forEach((value, key) => {
      headers[key] = value;
    });
  }

  return createGraphQLClient({
    headers,
    credentials: "same-origin",
  });
}
