// src/features/communication/call/services/call.service.ts
import { httpClient } from "@/lib/axios/httpClient";
import { CallTokenResult } from "../types/call.types";

export interface RequestCallTokenOptions {
  conversationId: string;
  userId?: string;
}

export const callService = {
  /**
   * Request a LiveKit call token from backend for the given conversation.
   * Architecture-ready for upcoming LiveKit media connection phase.
   *
   * @param options conversationId and optional userId for header auth
   */
  async requestCallToken(options: RequestCallTokenOptions): Promise<CallTokenResult> {
    const { conversationId, userId } = options;
    const response = await httpClient.post<{
      message?: string;
      data?: CallTokenResult;
      token?: string;
      serverUrl?: string;
      roomName?: string;
    }>("/calls/token", { conversationId }, {
      headers: userId ? { "x-user-id": userId } : undefined,
    });

    // Backend may return direct { token, serverUrl, roomName } or standard envelope { data: { token, serverUrl, roomName } }
    const raw = response as unknown as Record<string, unknown> | undefined;
    const data =
      raw?.data && typeof raw.data === "object"
        ? (raw.data as Record<string, unknown>)
        : raw;

    const result: CallTokenResult = {
      token: typeof data?.token === "string" ? data.token : "",
      serverUrl: typeof data?.serverUrl === "string" ? data.serverUrl : "",
      roomName: typeof data?.roomName === "string" ? data.roomName : "",
    };

    return result;
  },
};
