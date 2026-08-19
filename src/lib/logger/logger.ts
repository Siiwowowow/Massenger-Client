// src/lib/logger/logger.ts

const isProduction = process.env.NODE_ENV === "production";

function sanitize(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const sanitizedObj: Record<string, unknown> = {};
  const sensitiveKeys = ["password", "token", "accesstoken", "refreshtoken", "secret", "authorization", "cookie"];

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      sanitizedObj[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitizedObj[key] = sanitize(value);
    } else {
      sanitizedObj[key] = value;
    }
  }

  return sanitizedObj;
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (!isProduction) {
      console.debug("[DEBUG]", ...args.map(sanitize));
    }
  },
  info: (...args: unknown[]) => {
    if (!isProduction) {
      console.info("[INFO]", ...args.map(sanitize));
    }
  },
  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args.map(sanitize));
  },
  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args.map(sanitize));
  },
};
