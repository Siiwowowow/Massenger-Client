// src/features/project/hooks/use-project.ts
"use client";

import { useUser } from "@/features/user/hooks/useUser";
import { env } from "@/config/env";
import { useGraphQLQuery } from "@/lib/graphql/hooks";
import {
  GetProjectByIdDocument,
  type GetProjectByIdQuery,
  type GetProjectByIdQueryVariables,
} from "@/lib/graphql/generated/graphql";

export interface ProjectMetadata {
  id: string;
  name: string;
  slug: string;
  status: string;
  totalConversations?: number | null;
  totalUsers?: number | null;
}

/**
 * Hook for resolving active project context.
 * Strictly respects backend role authorization:
 * - Admin/SuperAdmin users fetch live project metadata via GraphQL `project(id)`.
 * - Ordinary users safely use the project-scoped configuration without triggering forbidden queries.
 */
export function useProject() {
  const { user } = useUser();
  const projectId = env.client.NEXT_PUBLIC_PROJECT_ID;

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // Execute role-protected Project GraphQL query only if the current user has permission
  const { data, isLoading } = useGraphQLQuery<
    GetProjectByIdQuery,
    GetProjectByIdQueryVariables
  >({
    document: GetProjectByIdDocument,
    variables: { id: projectId },
    queryKey: ["graphql", "project", projectId],
    enabled: Boolean(isAdmin && projectId),
    staleTime: 60000,
  });

  const project: ProjectMetadata = data?.project
    ? {
        id: data.project.id,
        name: data.project.name,
        slug: data.project.slug,
        status: data.project.status,
        totalConversations: data.project.totalConversations,
        totalUsers: data.project.totalUsers,
      }
    : {
        id: projectId,
        name: "Communication Project",
        slug: "default",
        status: "ACTIVE",
      };

  return {
    projectId,
    project,
    isAdmin,
    isLoading: isAdmin ? isLoading : false,
  };
}
