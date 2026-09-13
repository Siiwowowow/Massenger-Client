// src/features/communication/call/services/call.service.ts
import { httpClient } from "@/lib/axios/httpClient";
import { CallTokenResult } from "../types/call.types";

export interface RequestCallTokenOptions {
  conversationId: string;
  userId?: string;
}

export interface StartCallResult {
  isBusy: boolean;
  callId?: string;
  conversationId: string;
  receiverId?: string;
  receiverOnline?: boolean;
}

export const callService = {
  async startCall(options: {
    conversationId: string;
    callType: "AUDIO" | "VIDEO";
    userId?: string;
  }): Promise<StartCallResult> {
    const response = await httpClient.post<{ data?: StartCallResult }>(
      "/calls/start",
      { conversationId: options.conversationId, callType: options.callType },
      { headers: options.userId ? { "x-user-id": options.userId } : undefined }
    );
    const raw = response as unknown as { data?: StartCallResult } | StartCallResult;
    return (raw as { data?: StartCallResult }).data || (raw as StartCallResult);
  },

  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const response = await httpClient.get<{ data?: { isOnline?: boolean } }>(
        `/communication-users/${userId}/presence`
      );
      const raw = response as unknown as { data?: { isOnline?: boolean } };
      return Boolean(raw?.data?.isOnline);
    } catch {
      return false;
    }
  },

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
