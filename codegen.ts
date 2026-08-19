import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:5000/graphql",
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
