// src/constants/app.ts

export const APP_CONFIG = {
  name: "PrimarySetup",
  description: "Next.js 16 Production Starter Template",
  version: "1.0.0",
  defaultPagination: {
    page: 1,
    limit: 10,
  },
  queryDefaults: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  },
} as const;
