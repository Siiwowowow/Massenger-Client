/* eslint-disable @typescript-eslint/no-explicit-any */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeJsonParseText<T = any>(text: string, fallback: any = {}): T {
  try {
    if (!text || !text.trim()) return fallback as T;
    return JSON.parse(text) as T;
  } catch {
    return fallback as T;
  }
}

