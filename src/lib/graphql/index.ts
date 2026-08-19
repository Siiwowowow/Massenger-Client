// src/lib/graphql/index.ts
export {
  graphqlClient,
  graphqlRequest,
  createGraphQLClient,
  getServerGraphQLClient,
  getGraphQLEndpoint,
} from "./client";

export {
  useGraphQLQuery,
  useGraphQLMutation,
  type UseGraphQLQueryOptions,
  type UseGraphQLMutationOptions,
} from "./hooks";

export type {
  GraphQLRequestOptions,
  GraphQLOperation,
  GraphQLErrorItem,
  GraphQLErrorLocation,
} from "./types";
