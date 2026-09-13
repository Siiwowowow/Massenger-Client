import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .min(1, "NEXT_PUBLIC_API_BASE_URL is required")
    .default("http://localhost:5000/api/v1"),
  NEXT_PUBLIC_GRAPHQL_URL: z
    .string()
    .min(1, "NEXT_PUBLIC_GRAPHQL_URL is required")
    .default("http://localhost:5000/graphql"),
  NEXT_PUBLIC_PROJECT_ID: z
    .string()
    .default("6a9a46e2c13d4f5a5538dcd5"),
  NEXT_PUBLIC_SOCKET_URL: z
    .string()
    .default("http://localhost:5000"),
  NEXT_PUBLIC_LIVEKIT_URL: z
    .string()
    .optional()
    .transform((val) => val?.trim() || ""),
});

const serverEnvSchema = z.object({
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required on server").default("default_secret"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsedClient = clientEnvSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_GRAPHQL_URL: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  NEXT_PUBLIC_PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID,
  NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
});

if (!parsedClient.success) {
  console.error("❌ Invalid client environment variables:", parsedClient.error.format());
  throw new Error("Invalid client environment variables");
}

export const clientEnv = parsedClient.data;

export const getServerEnv = () => {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables cannot be accessed on the client");
  }
  const parsedServer = serverEnvSchema.safeParse({
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsedServer.success) {
    console.error("❌ Invalid server environment variables:", parsedServer.error.format());
    throw new Error("Invalid server environment variables");
  }

  return parsedServer.data;
};

export const env = {
  client: clientEnv,
  get server() {
    return getServerEnv();
  },
};
