import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: process.env.GRAPHQL_SCHEMA_PATH || "./src/lib/graphql/schema.graphql",
  documents: ["src/**/*.graphql", "src/**/graphql/*.{ts,tsx}"],
  generates: {
    "./src/lib/graphql/generated/": {
      preset: "client",
      plugins: [],
      config: {
        useTypeImports: true,
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
