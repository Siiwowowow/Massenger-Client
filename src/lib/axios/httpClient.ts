// src/lib/axios/httpClient.ts
import { ApiResponse, ApiRequestOptions } from "@/types/api.types";
import { env } from "@/config/env";
import { parseApiError } from "@/lib/api/api-error";
import axios from "axios";

const instance = axios.create({
  baseURL: env.client.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach project context for communication APIs
instance.interceptors.request.use((config) => {
  if (env.client.NEXT_PUBLIC_PROJECT_ID && !config.headers["x-project-id"]) {
    config.headers["x-project-id"] = env.client.NEXT_PUBLIC_PROJECT_ID;
  }

  if (typeof window !== "undefined") {
    const commUserId = localStorage.getItem("pulse_comm_user_id");
    const userId = localStorage.getItem("pulse_user_id");
    const token = localStorage.getItem("pulse_access_token");

    if (commUserId && !config.headers["x-user-id"]) {
      config.headers["x-user-id"] = commUserId;
    } else if (userId && !config.headers["x-user-id"]) {
      config.headers["x-user-id"] = userId;
    }

    if (userId && !config.headers["x-external-id"]) {
      config.headers["x-external-id"] = userId;
    }

    if (token && !config.headers["Authorization"]) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return config;
});

// Response interceptor to handle session expiry (401) with protection against infinite reload loops
let isRedirectingToLogin = false;

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        // Never redirect if already on auth routes
        if (!currentPath.startsWith("/login") && !currentPath.startsWith("/register") && !isRedirectingToLogin) {
          // If the user identity was simply missing in headers, do not immediately kill session and loop
          const hasStoredAuth = localStorage.getItem("pulse_user_id") || localStorage.getItem("pulse_access_token");
          if (!hasStoredAuth) {
            isRedirectingToLogin = true;
            localStorage.removeItem("pulse_user_id");
            localStorage.removeItem("pulse_external_id");
            localStorage.removeItem("pulse_access_token");
            localStorage.removeItem("pulse_comm_user_id");
            window.location.href = "/login";
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

const httpGet = async <TData>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
  try {
    const response = await instance.get<ApiResponse<TData>>(endpoint, {
      params: options?.params,
      headers: options?.headers,
    });
    return response.data;
  } catch (error) {
    throw parseApiError(error);
  }
};

const httpPost = async <TData>(
  endpoint: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<ApiResponse<TData>> => {
  try {
    const response = await instance.post<ApiResponse<TData>>(endpoint, data, {
      params: options?.params,
      headers: options?.headers,
    });
    return response.data;
  } catch (error) {
    throw parseApiError(error);
  }
};

const httpPut = async <TData>(
  endpoint: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<ApiResponse<TData>> => {
  try {
    const response = await instance.put<ApiResponse<TData>>(endpoint, data, {
      params: options?.params,
      headers: options?.headers,
    });
    return response.data;
  } catch (error) {
    throw parseApiError(error);
  }
};

const httpPatch = async <TData>(
  endpoint: string,
  data?: unknown,
  options?: ApiRequestOptions
): Promise<ApiResponse<TData>> => {
  try {
    const response = await instance.patch<ApiResponse<TData>>(endpoint, data, {
      params: options?.params,
      headers: options?.headers,
    });
    return response.data;
  } catch (error) {
    throw parseApiError(error);
  }
};

const httpDelete = async <TData>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
  try {
    const response = await instance.delete<ApiResponse<TData>>(endpoint, {
      params: options?.params,
      headers: options?.headers,
    });
    return response.data;
  } catch (error) {
    throw parseApiError(error);
  }
};

export const httpClient = {
  instance,
  get: httpGet,
  post: httpPost,
  put: httpPut,
  patch: httpPatch,
  delete: httpDelete,
};