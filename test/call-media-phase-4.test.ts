// test/call-media-phase-4.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LiveKitCallManager } from "../src/features/communication/call/services/livekit-call-manager";
import { callService } from "../src/features/communication/call/services/call.service";

// Track stop spies
const mockAudioTrackStop = vi.fn();
const mockVideoTrackStop = vi.fn();

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
      audioTrackPublications: new Map([
        [
          "audio_pub_1",
          {
            track: {
              stop: mockAudioTrackStop,
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

describe("Frontend Call Phase 4 — Real Audio & Video Media Lifecycle Tests", () => {
  let manager: LiveKitCallManager;
  let requestCallTokenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockAudioTrackStop.mockClear();
    mockVideoTrackStop.mockClear();
    manager = new LiveKitCallManager();
    requestCallTokenSpy = vi.spyOn(callService, "requestCallToken").mockResolvedValue({
      token: "phase4_valid_token",
      serverUrl: "wss://livekit.pulse-messenger.test:7880",
      roomName: "room_phase4_media",
    });
  });

  afterEach(() => {
    manager.disconnect();
    vi.clearAllMocks();
  });

  // 1. Audio Call publishes microphone only, never camera
  it("1. Audio Call publishes microphone only and never requests or publishes camera", async () => {
    await manager.connect({
      callId: "call_audio_1",
      conversationId: "conv_audio_1",
      callState: "ACCEPTED",
      callType: "AUDIO",
    });

    const room = manager.getRoom();
    expect(room).toBeDefined();
    expect(room?.connect).toHaveBeenCalledWith(
      "wss://livekit.pulse-messenger.test:7880",
      "phase4_valid_token",
      expect.objectContaining({ autoSubscribe: true })
    );

    // Microphone was published
    expect(room?.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    // Camera was NEVER published
    expect(room?.localParticipant.setCameraEnabled).not.toHaveBeenCalled();

    // Media state verification
    const media = manager.getMediaState();
    expect(media.isMicEnabled).toBe(true);
    expect(media.isCameraEnabled).toBe(false);
  });

  // 2. Video Call publishes both microphone and camera
  it("2. Video Call publishes both microphone and camera tracks", async () => {
    await manager.connect({
      callId: "call_video_1",
      conversationId: "conv_video_1",
      callState: "ACCEPTED",
      callType: "VIDEO",
    });

    const room = manager.getRoom();
    expect(room).toBeDefined();

    // Both microphone and camera published
    expect(room?.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(room?.localParticipant.setCameraEnabled).toHaveBeenCalledWith(true);

    const media = manager.getMediaState();
    expect(media.isMicEnabled).toBe(true);
    expect(media.isCameraEnabled).toBe(true);
  });

  // 3. Autoplay startAudio() is called upon connection
  it("3. Invokes room.startAudio() to handle browser autoplay policies", async () => {
    await manager.connect({
      callId: "call_audio_autoplay",
      conversationId: "conv_autoplay",
      callState: "ACCEPTED",
      callType: "AUDIO",
    });

    const room = manager.getRoom();
    expect(room?.startAudio).toHaveBeenCalled();
  });

  // 4. Microphone toggle switches mic state on/off
  it("4. toggleMicrophone() turns mic on and off", async () => {
    await manager.connect({
      callId: "call_mic_toggle",
      conversationId: "conv_mic_toggle",
      callState: "ACCEPTED",
      callType: "AUDIO",
    });

    const room = manager.getRoom();
    expect(manager.isMicrophoneEnabled()).toBe(true);

    // Mute mic
    const stateAfterMute = await manager.toggleMicrophone();
    expect(stateAfterMute).toBe(false);
    expect(room?.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(false);
    expect(manager.isMicrophoneEnabled()).toBe(false);

    // Unmute mic
    const stateAfterUnmute = await manager.toggleMicrophone();
    expect(stateAfterUnmute).toBe(true);
    expect(room?.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(manager.isMicrophoneEnabled()).toBe(true);
  });

  // 5. Camera toggle in Video Call switches camera state on/off
  it("5. toggleCamera() turns camera on and off during VIDEO calls", async () => {
    await manager.connect({
      callId: "call_cam_toggle",
      conversationId: "conv_cam_toggle",
      callState: "ACCEPTED",
      callType: "VIDEO",
    });

    const room = manager.getRoom();
    expect(manager.isCameraEnabled()).toBe(true);

    // Disable camera
    const stateAfterOff = await manager.toggleCamera();
    expect(stateAfterOff).toBe(false);
    expect(room?.localParticipant.setCameraEnabled).toHaveBeenCalledWith(false);
    expect(manager.isCameraEnabled()).toBe(false);

    // Re-enable camera
    const stateAfterOn = await manager.toggleCamera();
    expect(stateAfterOn).toBe(true);
    expect(room?.localParticipant.setCameraEnabled).toHaveBeenCalledWith(true);
    expect(manager.isCameraEnabled()).toBe(true);
  });

  // 6. Camera toggle in Audio Call is strictly guarded (cannot switch to camera)
  it("6. toggleCamera() is strictly a no-op during AUDIO calls", async () => {
    await manager.connect({
      callId: "call_audio_no_cam",
      conversationId: "conv_audio_no_cam",
      callState: "ACCEPTED",
      callType: "AUDIO",
    });

    const room = manager.getRoom();
    const result = await manager.toggleCamera();
    expect(result).toBe(false);
    expect(room?.localParticipant.setCameraEnabled).not.toHaveBeenCalled();
    expect(manager.isCameraEnabled()).toBe(false);
  });

  // 7. Video call gracefully degrades to audio if camera permission fails
  it("7. Video call gracefully continues as audio-only if camera permission fails", async () => {
    // Connect initial room where setCameraEnabled throws permission denied
    const originalManager = new LiveKitCallManager();
    const room = originalManager.getRoom();
    expect(room).toBeNull();

    // We can simulate camera permission failure
    const customManager = new LiveKitCallManager();
    // Temporarily replace Room constructor prototype
    const livekitModule = await import("livekit-client");
    const origRoom = livekitModule.Room;

    // Use a custom room instance where camera fails
    class CamFailRoom extends origRoom {
      constructor() {
        super();
        this.localParticipant.setCameraEnabled = vi.fn().mockRejectedValue(new Error("Permission denied"));
      }
    }
    (livekitModule as Record<string, unknown>).Room = CamFailRoom;

    try {
      await customManager.connect({
        callId: "call_video_cam_fail",
        conversationId: "conv_cam_fail",
        callState: "ACCEPTED",
        callType: "VIDEO",
      });

      // Call is still connected!
      expect(customManager.getConnectionState()).toBe("CONNECTED");
      const media = customManager.getMediaState();
      // Mic succeeded
      expect(media.isMicEnabled).toBe(true);
      // Cam failed
      expect(media.isCameraEnabled).toBe(false);
      expect(media.hasCameraError).toBe(true);
      expect(media.mediaErrorMessage).toContain("Camera access denied");
    } finally {
      (livekitModule as Record<string, unknown>).Room = origRoom;
      customManager.disconnect();
    }
  });

  // 8. Disconnect cleanly stops all local audio & video hardware tracks
  it("8. Disconnect releases hardware by calling track.stop() on all local publications", async () => {
    await manager.connect({
      callId: "call_cleanup_test",
      conversationId: "conv_cleanup_test",
      callState: "ACCEPTED",
      callType: "VIDEO",
    });

    expect(mockAudioTrackStop).not.toHaveBeenCalled();
    expect(mockVideoTrackStop).not.toHaveBeenCalled();

    // Disconnect
    manager.disconnect();

    // Verify track.stop() was called on all local publications
    expect(mockAudioTrackStop).toHaveBeenCalledTimes(1);
    expect(mockVideoTrackStop).toHaveBeenCalledTimes(1);
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
    expect(manager.getRoom()).toBeNull();
  });

  // 9. Stale call token does not attach media tracks
  it("9. Stale call protection prevents late media publication if call was terminated", async () => {
    let resolveToken: (val: unknown) => void = () => {};
    requestCallTokenSpy.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveToken = resolve;
      })
    );

    const connectPromise = manager.connect({
      callId: "call_stale_media",
      conversationId: "conv_stale_media",
      callState: "ACCEPTED",
      callType: "VIDEO",
    });

    // Before token resolves, call ends
    manager.disconnect();

    // Now late token resolves
    resolveToken({
      token: "late_token_123",
      serverUrl: "wss://livekit.test:7880",
      roomName: "room_stale",
    });

    await connectPromise;

    // Room must NOT be connected
    expect(manager.getConnectionState()).toBe("DISCONNECTED");
    expect(manager.getRoom()).toBeNull();
  });

  // 10. Duplicate connection prevention preserves existing media session
  it("10. Duplicate connect call for same active callId is ignored", async () => {
    await manager.connect({
      callId: "call_duplicate_1",
      conversationId: "conv_duplicate_1",
      callState: "ACCEPTED",
      callType: "VIDEO",
    });

    expect(requestCallTokenSpy).toHaveBeenCalledTimes(1);

    // Second connect call with identical callId
    await manager.connect({
      callId: "call_duplicate_1",
      conversationId: "conv_duplicate_1",
      callState: "ACCEPTED",
      callType: "VIDEO",
    });

    // Token should NOT be requested again
    expect(requestCallTokenSpy).toHaveBeenCalledTimes(1);
  });
});
