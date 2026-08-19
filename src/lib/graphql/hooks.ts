// src/lib/graphql/hooks.ts
"use client";

import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseQueryResult,
  type UseMutationResult,
  type QueryKey,
} from "@tanstack/react-query";
import type { RequestDocument, Variables } from "graphql-request";
import { graphqlRequest } from "./client";
import type { GraphQLRequestOptions } from "./types";
import type { ApiError } from "@/lib/api/api-error";

export interface UseGraphQLQueryOptions<TData, TVariables extends Variables = Variables>
  extends Omit<UseQueryOptions<TData, ApiError, TData, QueryKey>, "queryKey" | "queryFn"> {
  queryKey: QueryKey;
  document: RequestDocument;
  variables?: TVariables;
  requestOptions?: GraphQLRequestOptions;
}

/**
 * Generic TanStack Query hook for executing GraphQL queries with full type-safety.
 *
 * @example
 * ```ts
 * const { data, isLoading } = useGraphQLQuery<UserData, UserVariables>({
 *   queryKey: ["user", userId],
 *   document: GET_USER_QUERY,
 *   variables: { id: userId },
 *   enabled: Boolean(userId),
 * });
 * ```
 */
export function useGraphQLQuery<TData, TVariables extends Variables = Variables>({
  queryKey,
  document,
  variables,
  requestOptions,
  ...queryOptions
}: UseGraphQLQueryOptions<TData, TVariables>): UseQueryResult<TData, ApiError> {
  return useQuery<TData, ApiError, TData, QueryKey>({
    queryKey,
    queryFn: () => graphqlRequest<TData, TVariables>(document, variables, requestOptions),
    ...queryOptions,
  });
}

export interface UseGraphQLMutationOptions<TData, TVariables extends Variables = Variables>
  extends Omit<UseMutationOptions<TData, ApiError, TVariables>, "mutationFn"> {
  document: RequestDocument;
  requestOptions?: GraphQLRequestOptions;
}

/**
 * Generic TanStack Query hook for executing GraphQL mutations with full type-safety.
 *
 * @example
 * ```ts
 * const { mutate, isPending } = useGraphQLMutation<UpdateUserResponse, UpdateUserInput>({
 *   document: UPDATE_USER_MUTATION,
 *   onSuccess: (data) => console.log("Updated", data),
 * });
 * ```
 */
export function useGraphQLMutation<TData, TVariables extends Variables = Variables>({
  document,
  requestOptions,
  ...mutationOptions
}: UseGraphQLMutationOptions<TData, TVariables>): UseMutationResult<TData, ApiError, TVariables> {
  return useMutation<TData, ApiError, TVariables>({
    mutationFn: (variables: TVariables) =>
      graphqlRequest<TData, TVariables>(document, variables, requestOptions),
    ...mutationOptions,
  });
}
