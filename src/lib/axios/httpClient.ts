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
  return config;
});

// Response interceptor to handle session expiry (401)
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
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