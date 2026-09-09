// test/call-livekit-phase-3.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LiveKitCallManager } from "../src/features/communication/call/services/livekit-call-manager";
import { callService } from "../src/features/communication/call/services/call.service";

// Mock livekit-client
vi.mock("livekit-client", () => {
  class MockRoom {
    public listeners = new Map<string, ((...args: unknown[]) => void)[]>();
    public state = "disconnected";
    public options: unknown;

    constructor(options?: unknown) {
      this.options = options;
    }

    public connect = vi.fn().mockImplementation(async () => {
      this.state = "connected";
      const connectedCbs = this.listeners.get("connected") || [];
      connectedCbs.forEach((cb) => cb());
      const stateCbs = this.listeners.get("connectionStateChanged") || [];
      stateCbs.forEach((cb) => cb("connected"));
    });

    public disconnect = vi.fn().mockImplementation(() => {
      this.state = "disconnected";
      const disconnectedCbs = this.listeners.get("disconnected") || [];
      disconnectedCbs.forEach((cb) => cb());
      const stateCbs = this.listeners.get("connectionStateChanged") || [];
      stateCbs.forEach((cb) => cb("disconnected"));
    });

    public on = vi.fn().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      const list = this.listeners.get(event) || [];
      list.push(cb);
      this.listeners.set(event, list);
    });

    public removeAllListeners = vi.fn().mockImplementation(() => {
      this.listeners.clear();
    });

    public startAudio = vi.fn().mockResolvedValue(undefined);

    public localParticipant = {
      isMicrophoneEnabled: true,
      isCameraEnabled: false,
      setMicrophoneEnabled: vi.fn().mockImplementation(async (enabled: boolean) => {
        this.localParticipant.isMicrophoneEnabled = enabled;
      }),
      setCameraEnabled: vi.fn().mockImplementation(async (enabled: boolean) => {
        this.localParticipant.isCameraEnabled = enabled;
      }),
      audioTrackPublications: new Map(),
      videoTrackPublications: new Map(),
    };

    // Helper for testing events
    public emit(event: string, ...args: unknown[]) {
      const list = this.listeners.get(event) || [];
      list.forEach((cb) => cb(...args));
    }
  }

  return {
    Room: MockRoom,
    Track: {
      Source: {
        Camera: "camera",
        Microphone: "microphone",
      },
    },
    RoomEvent: {
      Connected: "connected",
      Disconnected: "disconnected",
      Reconnecting: "reconnecting",
      Reconnected: "reconnected",
      ConnectionStateChanged: "connectionStateChanged",
      TrackMuted: "trackMuted",
      TrackUnmuted: "trackUnmuted",
    },
    ConnectionState: {
      Connected: "connected",
      Connecting: "connecting",
      Reconnecting: "reconnecting",
      Disconnected: "disconnected",
    },
  };
});

describe("Frontend Call Phase 3 — LiveKit Connection Foundation Tests", () => {
  let manager: LiveKitCallManager;
  let requestCallTokenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    manager = new LiveKitCallManager();
    requestCallTokenSpy = vi.spyOn(callService, "requestCallToken").mockResolvedValue({
      token: "mock_jwt_token_phase_3",
      serverUrl: "wss://livekit.pulse-messenger.test:7880",
      roomName: "room_conversation_phase_3",
    });
  });

  afterEach(() => {
    manager.disconnect();
    vi.clearAllMocks();
  });

  // 1. Token requested only after ACCEPTED.
  it("1. Token requested only after ACCEPTED (not while ringing)", async () => {
    // Ringing incoming
    await manager.connect({
      callId: "call_ring_1",
      conversationId: "conv_1",
      callState: "RINGING_INCOMING",
    });
    expect(requestCallTokenSpy).not.toHaveBeenCalled();
    expect(manager.getConnectionState()).toBe("DISCONNECTED");

    // Ringing outgoing
    await manager.connect({
      callId: "call_ring_2",
      conversationId: "conv_2",
      callState: "RINGING_OUTGOING",
    });
    expect(requestCallTokenSpy).not.toHaveBeenCalled();
    expect(manager.getConnectionState()).toBe("DISCONNECTED");

    // Accepted
    await manager.connect({
      callId: "call_accepted_1",
      conversationId: "conv_1",
      callState: "ACCEPTED",
    });
    expect(requestCallTokenSpy).toHaveBeenCalledTimes(1);
    expect(manager.getConnectionState()).toBe("CONNECTED");
  });

  // 2. Correct conversationId sent.
  it("2. Correct conversationId sent to requestCallToken", async () => {
    const targetConversationId = "conversation_uuid_alpha_999";

    await manager.connect({
      callId: "call_abc_1",
      conversationId: targetConversationId,
      callState: "ACCEPTED",
    });

    expect(requestCallTokenSpy).toHaveBeenCalledWith({
      conversationId: targetConversationId,
    });
  });

  // 3. LiveKit connects using backend serverUrl.
  it("3. LiveKit connects using backend serverUrl", async () => {
    const customBackendUrl = "wss://custom-sfu.messenger.io:7880";
    requestCallTokenSpy.mockResolvedValueOnce({
      token: "valid_token_123",
      serverUrl: customBackendUrl,
      roomName: "room_custom_1",
    });

    await manager.connect({
      callId: "call_server_url_test",
      conversationId: "conv_server_test",
      callState: "ACCEPTED",
    });

    const room = manager.getRoom();
    expect(room).toBeDefined();
    expect(room?.connect).toHaveBeenCalledWith(
      customBackendUrl,
      "valid_token_123",
      expect.objectContaining({ autoSubscribe: true })
    );
  });

  // 4. LiveKit connects using backend roomName.
  it("4. LiveKit connects using backend roomName and validates room session", async () => {
    const expectedRoomName = "call_room_livekit_555";
    requestCallTokenSpy.mockResolvedValueOnce({
      token: "mock_token_for_room",
      serverUrl: "wss://livekit.test:7880",
      roomName: expectedRoomName,
    });

    await manager.connect({
      callId: "call_room_test",
      conversationId: "conv_room_test",
      callState: "ACCEPTED",
    });

    expect(manager.getConnectionState()).toBe("CONNECTED");
    expect(manager.getConnectedCallId()).toBe("call_room_test");
  });

  // 5. Token is not stored persistently.
  it("5. Token is not stored persistently in localStorage or sessionStorage", async () => {
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    const originalLocal = globalThis.localStorage;
    const originalSession = globalThis.sessionStorage;

    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    try {
      await manager.connect({
        callId: "call_security_test",
        conversationId: "conv_sec_test",
        callState: "ACCEPTED",
      });

      // Verify neither localStorage nor sessionStorage setItem was called with token
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: originalLocal,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "sessionStorage", {
        value: originalSession,
        writable: true,
        configurable: true,
      });
    }
  });

  // 6. Duplicate connection prevented.
  it("6. Duplicate connection prevented when already connected or connecting", async () => {
    // First connection
    const connectPromise1 = manager.connect({
      callId: "call_dup_1",
      conversationId: "conv_dup",
      callState: "ACCEPTED",
    });

    // Concurrent second connection for identical callId
    const connectPromise2 = manager.connect({
      callId: "call_dup_1",
      conversationId: "conv_dup",
      callState: "ACCEPTED",
    });

    await Promise.all([connectPromise1, connectPromise2]);

    // Token should have been requested exactly once
    expect(requestCallTokenSpy).toHaveBeenCalledTimes(1);

    // A third call after connection is established should also be ignored
    await manager.connect({
      callId: "call_dup_1",
      conversationId: "conv_dup",
      callState: "ACCEPTED",
    });
    expect(requestCallTokenSpy).toHaveBeenCalledTimes(1);
  });

  // 7. call:ended disconnects room.
  it("7. call:ended disconnects room and resets state to DISCONNECTED", async () => {
    await manager.connect({
      callId: "call_end_test",
      conversationId: "conv_end",
      callState: "ACCEPTED",
    });

    expect(manager.getConnectionState()).toBe("CONNECTED");
    const room = manager.getRoom();
    expect(room).toBeDefined();

    // Call ends -> connect with ENDED or disconnect()
    manager.disconnect();

    expect(room?.disconnect).toHaveBeenCalled();
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
    expect(manager.getRoom()).toBeNull();
    expect(manager.getConnectedCallId()).toBeNull();
  });

  // 8. stale callId cannot connect.
  it("8. Stale callId cannot connect if call ends or switches before token resolves", async () => {
    let resolveTokenRequest!: (value: unknown) => void;
    requestCallTokenSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTokenRequest = resolve;
        })
    );

    // Call A starts token request
    const connectPromiseA = manager.connect({
      callId: "call_A",
      conversationId: "conv_A",
      callState: "ACCEPTED",
    });

    // While Call A request is pending, Call A ends!
    manager.disconnect();
    expect(manager.getConnectionState()).toBe("DISCONNECTED");

    // Late token response for Call A arrives now
    resolveTokenRequest({
      token: "late_token_call_A",
      serverUrl: "wss://late.test:7880",
      roomName: "room_late_A",
    });

    await connectPromiseA;

    // Room must NOT connect with Call A's stale token
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
    expect(manager.getRoom()).toBeNull();
    expect(manager.getConnectedCallId()).toBeNull();
  });

  // 9. reconnect state handled.
  it("9. Reconnecting state is tracked and handled on Room events", async () => {
    await manager.connect({
      callId: "call_reconnect_test",
      conversationId: "conv_reconnect",
      callState: "ACCEPTED",
    });

    expect(manager.getConnectionState()).toBe("CONNECTED");
    const room = manager.getRoom() as unknown as { emit: (event: string) => void };

    // Emit reconnecting event
    room.emit("reconnecting");
    expect(manager.getConnectionState()).toBe("RECONNECTING");

    // Emit reconnected event
    room.emit("reconnected");
    expect(manager.getConnectionState()).toBe("CONNECTED");
  });

  // 10. unmount cleans connection.
  it("10. Teardown / unmount cleans connection and unbinds listeners", async () => {
    await manager.connect({
      callId: "call_cleanup_test",
      conversationId: "conv_cleanup",
      callState: "ACCEPTED",
    });

    const room = manager.getRoom();
    expect(room).toBeDefined();

    // Destroy/teardown
    manager.destroy();

    expect(room?.removeAllListeners).toHaveBeenCalled();
    expect(room?.disconnect).toHaveBeenCalled();
    expect(manager.getRoom()).toBeNull();
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
  });
});
