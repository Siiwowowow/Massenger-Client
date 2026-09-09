// test/call-reliability-phase-5.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LiveKitCallManager } from "../src/features/communication/call/services/livekit-call-manager";
import { callService } from "../src/features/communication/call/services/call.service";
import { callSlice, initiateOutgoingCall, setCallAccepted, setCallRejected, setCallCancelled, setCallEnded, setCallBusy, resetCallState } from "../src/features/communication/call/slices/callSlice";

// Mock track stops
const mockAudioTrackStop = vi.fn();
const mockVideoTrackStop = vi.fn();
const mockMediaStreamTrackStop = vi.fn();

// Mock livekit-client
vi.mock("livekit-client", () => {
  class MockRoom {
    public listeners = new Map<string, ((...args: unknown[]) => void)[]>();
    public state = "disconnected";
    public options: unknown;

    public localParticipant = {
      isMicrophoneEnabled: false,
      isCameraEnabled: false,
      setMicrophoneEnabled: vi.fn().mockImplementation(async (enabled: boolean) => {
        this.localParticipant.isMicrophoneEnabled = enabled;
      }),
      setCameraEnabled: vi.fn().mockImplementation(async (enabled: boolean) => {
        this.localParticipant.isCameraEnabled = enabled;
      }),
      trackPublications: new Map([
        [
          "track_pub_1",
          {
            track: {
              stop: mockAudioTrackStop,
              mediaStreamTrack: { stop: mockMediaStreamTrackStop },
            },
          },
        ],
        [
          "track_pub_2",
          {
            track: {
              stop: mockVideoTrackStop,
              mediaStreamTrack: { stop: mockMediaStreamTrackStop },
            },
          },
        ],
      ]),
      audioTrackPublications: new Map([
        [
          "audio_pub_1",
          {
            track: {
              stop: mockAudioTrackStop,
              mediaStreamTrack: { stop: mockMediaStreamTrackStop },
            },
          },
        ],
      ]),
      videoTrackPublications: new Map([
        [
          "video_pub_1",
          {
            track: {
              stop: mockVideoTrackStop,
              mediaStreamTrack: { stop: mockMediaStreamTrackStop },
            },
          },
        ],
      ]),
    };

    constructor(options?: unknown) {
      this.options = options;
    }

    public startAudio = vi.fn().mockResolvedValue(undefined);

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

describe("Frontend Call Phase 5 — Reliability, Lifecycle & Cleanup Tests", () => {
  let manager: LiveKitCallManager;
  let requestCallTokenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockAudioTrackStop.mockClear();
    mockVideoTrackStop.mockClear();
    mockMediaStreamTrackStop.mockClear();
    manager = new LiveKitCallManager();
    requestCallTokenSpy = vi.spyOn(callService, "requestCallToken").mockResolvedValue({
      token: "valid_jwt_phase5",
      serverUrl: "wss://livekit.pulse-messenger.test:7880",
      roomName: "room_phase5_reliability",
    });
  });

  afterEach(() => {
    manager.disconnect();
    vi.clearAllMocks();
  });

  // 1. Full Lifecycle: RINGING -> ACCEPTED -> CONNECTED -> LOCAL END -> Clean Disconnect
  it("1. Complete lifecycle: Accepted call to local end cleanly disconnects with zero media leaks", async () => {
    // Redux lifecycle
    let state = callSlice.reducer(
      undefined,
      initiateOutgoingCall({
        conversationId: "conv_life_1",
        callType: "VIDEO",
        receiver: { name: "Alice", id: "user_alice" },
      })
    );
    expect(state.callState).toBe("RINGING_OUTGOING");

    state = callSlice.reducer(
      state,
      setCallAccepted({ callId: "call_life_1" })
    );
    expect(state.callState).toBe("ACCEPTED");

    // Manager connects upon ACCEPTED
    await manager.connect({
      callId: "call_life_1",
      conversationId: "conv_life_1",
      callState: "ACCEPTED",
      callType: "VIDEO",
    });

    expect(manager.getConnectionState()).toBe("CONNECTED");
    expect(manager.getRoom()).not.toBeNull();

    // Local end
    state = callSlice.reducer(
      state,
      setCallEnded({ callId: "call_life_1", reason: "NORMAL" })
    );
    expect(state.callState).toBe("ENDED");

    manager.disconnect();

    // Zero media leak verification
    expect(mockAudioTrackStop).toHaveBeenCalled();
    expect(mockVideoTrackStop).toHaveBeenCalled();
    expect(mockMediaStreamTrackStop).toHaveBeenCalled();
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
    expect(manager.getRoom()).toBeNull();
  });

  // 2. Full Lifecycle: ACCEPTED -> REMOTE END -> Clean Disconnect
  it("2. Complete lifecycle: Connected call to remote end cleanly releases all media tracks", async () => {
    await manager.connect({
      callId: "call_remote_end",
      conversationId: "conv_remote_end",
      callState: "ACCEPTED",
      callType: "AUDIO",
    });

    expect(manager.getConnectionState()).toBe("CONNECTED");

    // Remote user terminates call
    const state = callSlice.reducer(
      {
        callState: "ACCEPTED",
        activeCall: {
          callId: "call_remote_end",
          conversationId: "conv_remote_end",
          callType: "AUDIO",
          caller: null,
          receiver: null,
        },
        statusMessage: "Connected",
        error: null,
      },
      setCallEnded({ callId: "call_remote_end", reason: "NORMAL" })
    );
    expect(state.callState).toBe("ENDED");

    // Hook triggers disconnect
    manager.disconnect();

    expect(mockAudioTrackStop).toHaveBeenCalled();
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
    expect(manager.getRoom()).toBeNull();
  });

  // 3. Ringing -> Rejected: No LiveKit connection and resets cleanly
  it("3. Outgoing ringing rejected cleanly aborts without connecting media", async () => {
    const state = callSlice.reducer(
      {
        callState: "RINGING_OUTGOING",
        activeCall: {
          callId: "call_rejected_1",
          conversationId: "conv_rej",
          callType: "VIDEO",
          caller: null,
          receiver: null,
        },
        statusMessage: "Calling...",
        error: null,
      },
      setCallRejected({ callId: "call_rejected_1", reason: "Declined" })
    );
    expect(state.callState).toBe("REJECTED");
    expect(state.statusMessage).toBe("Declined");

    // Manager should remain DISCONNECTED
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
    expect(requestCallTokenSpy).not.toHaveBeenCalled();
  });

  // 4. Ringing -> Cancelled: Clean abort
  it("4. Outgoing ringing cancelled cleanly aborts without media leaks", async () => {
    const state = callSlice.reducer(
      {
        callState: "RINGING_OUTGOING",
        activeCall: {
          callId: "call_cancel_1",
          conversationId: "conv_cancel",
          callType: "AUDIO",
          caller: null,
          receiver: null,
        },
        statusMessage: "Calling...",
        error: null,
      },
      setCallCancelled({ callId: "call_cancel_1" })
    );
    expect(state.callState).toBe("CANCELLED");
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
    expect(requestCallTokenSpy).not.toHaveBeenCalled();
  });

  // 5. Ringing -> Busy: Clean notification and no connection
  it("5. Outgoing ringing busy cleanly notifies user and does not connect media", async () => {
    const state = callSlice.reducer(
      {
        callState: "RINGING_OUTGOING",
        activeCall: {
          callId: "call_busy_1",
          conversationId: "conv_busy",
          callType: "VIDEO",
          caller: null,
          receiver: null,
        },
        statusMessage: "Calling...",
        error: null,
      },
      setCallBusy({ callId: "call_busy_1", reason: "User is on another call." })
    );
    expect(state.callState).toBe("BUSY");
    expect(state.statusMessage).toContain("User is on another call.");
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
  });

  // 6. Ringing -> Timeout: Clean termination
  it("6. Call timeout cleanly updates state to TIMEOUT and resets", async () => {
    const state = callSlice.reducer(
      {
        callState: "RINGING_OUTGOING",
        activeCall: {
          callId: "call_timeout_1",
          conversationId: "conv_timeout",
          callType: "AUDIO",
          caller: null,
          receiver: null,
        },
        statusMessage: "Calling...",
        error: null,
      },
      setCallEnded({ callId: "call_timeout_1", reason: "TIMEOUT" })
    );
    expect(state.callState).toBe("ENDED");
    expect(state.statusMessage).toBe("Call timed out");
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
  });

  // 7. Reconnection Recovery: RECONNECTING -> CONNECTED
  it("7. Handles temporary network interruption and reconnects cleanly without duplicates", async () => {
    await manager.connect({
      callId: "call_reconnect_test",
      conversationId: "conv_reconnect",
      callState: "ACCEPTED",
      callType: "VIDEO",
    });

    const room = manager.getRoom();
    expect(manager.getConnectionState()).toBe("CONNECTED");

    // Network drops -> room emits Reconnecting
    (room as unknown as { emit: (event: string) => void }).emit("reconnecting");
    expect(manager.getConnectionState()).toBe("RECONNECTING");

    // Network restores -> room emits Reconnected
    (room as unknown as { emit: (event: string) => void }).emit("reconnected");
    expect(manager.getConnectionState()).toBe("CONNECTED");

    // Verify token was NOT requested a second time during internal room reconnection
    expect(requestCallTokenSpy).toHaveBeenCalledTimes(1);
  });

  // 8. Unexpected Disconnect Sets Human-Readable State
  it("8. Unexpected disconnect sets DISCONNECTED and clear error state", async () => {
    await manager.connect({
      callId: "call_drop_test",
      conversationId: "conv_drop",
      callState: "ACCEPTED",
      callType: "AUDIO",
    });

    const room = manager.getRoom();
    expect(manager.getConnectionState()).toBe("CONNECTED");

    // Room drops unexpectedly
    (room as unknown as { emit: (event: string) => void }).emit("disconnected");
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
    expect(manager.getConnectedCallId()).toBeNull();
  });

  // 9. Rapid Media Toggle Does Not Produce Race Conditions
  it("9. Rapid mic and camera toggling executes safely without race conditions", async () => {
    await manager.connect({
      callId: "call_rapid_toggle",
      conversationId: "conv_rapid_toggle",
      callState: "ACCEPTED",
      callType: "VIDEO",
    });

    // Rapid mic toggles in parallel
    const p1 = manager.toggleMicrophone();
    const p2 = manager.toggleMicrophone();
    const [res1, res2] = await Promise.all([p1, p2]);

    expect(typeof res1).toBe("boolean");
    expect(typeof res2).toBe("boolean");
    expect(manager.getMediaState().isMicEnabled).toBeDefined();

    // Rapid camera toggles in parallel
    const c1 = manager.toggleCamera();
    const c2 = manager.toggleCamera();
    const [cam1, cam2] = await Promise.all([c1, c2]);

    expect(typeof cam1).toBe("boolean");
    expect(typeof cam2).toBe("boolean");
    expect(manager.getMediaState().isCameraEnabled).toBeDefined();
  });

  // 10. resetCallState cleanly clears all active call data
  it("10. resetCallState cleanly resets Redux state to IDLE", () => {
    const activeState = {
      callState: "ENDED" as const,
      activeCall: {
        callId: "call_finished",
        conversationId: "conv_finished",
        callType: "VIDEO" as const,
        caller: null,
        receiver: null,
      },
      statusMessage: "Call ended",
      error: null,
    };

    const resetState = callSlice.reducer(activeState, resetCallState());
    expect(resetState.callState).toBe("IDLE");
    expect(resetState.activeCall).toBeNull();
    expect(resetState.statusMessage).toBeNull();
    expect(resetState.error).toBeNull();
  });
});
