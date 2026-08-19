// src/lib/graphql/types.ts
import type { RequestDocument, Variables } from "graphql-request";

export interface GraphQLRequestOptions {
  headers?: HeadersInit;
  signal?: AbortSignal;
  fetch?: typeof fetch;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
}

export interface GraphQLOperation<TVariables extends Variables = Variables> {
  document: RequestDocument;
  variables?: TVariables;
}

export interface GraphQLErrorLocation {
  line: number;
  column: number;
}

export interface GraphQLErrorItem {
  message: string;
  locations?: GraphQLErrorLocation[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}
