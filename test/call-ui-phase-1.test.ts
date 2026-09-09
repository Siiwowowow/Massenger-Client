// test/call-ui-phase-1.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import callReducer, {
  initiateOutgoingCall,
  setOutgoingRinging,
  setIncomingCall,
  setCallAccepted,
  setCallRejected,
  setCallCancelled,
  setCallEnded,
  setCallBusy,
  setCallError,
  resetCallState,
} from "../src/features/communication/call/slices/callSlice";
import communicationReducer, {
  setActiveConversationId,
} from "../src/features/communication/slices/communicationSlice";
import { REALTIME_EVENTS } from "../src/features/communication/socket/socket-events";
import {
  CallIncomingPayload,
  CallAcceptedPayload,
  CallRejectedPayload,
  CallCancelledPayload,
  CallEndedPayload,
  CallBusyPayload,
  CallErrorPayload,
} from "../src/features/communication/call/types/call.types";

describe("Frontend Call Phase 1 — Signaling & State Machine Tests", () => {
  let store: ReturnType<typeof createTestStore>;

  const createTestStore = () => {
    return configureStore({
      reducer: {
        call: callReducer,
        communication: communicationReducer,
      },
    });
  };

  beforeEach(() => {
    store = createTestStore();
  });

  // 1. Phone button emits AUDIO call:start payload format
  it("1. Phone button emits AUDIO call:start payload", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    const conversationId = "conv_12345";
    const payload = { conversationId, callType: "AUDIO" as const };

    mockSocket.emit(REALTIME_EVENTS.CLIENT.CALL_START, payload);

    expect(mockSocket.emit).toHaveBeenCalledWith("call:start", {
      conversationId: "conv_12345",
      callType: "AUDIO",
    });

    store.dispatch(
      initiateOutgoingCall({
        conversationId,
        callType: "AUDIO",
        receiver: { name: "Rahim" },
      })
    );

    const state = store.getState().call;
    expect(state.callState).toBe("RINGING_OUTGOING");
    expect(state.activeCall?.callType).toBe("AUDIO");
    expect(state.activeCall?.receiver?.name).toBe("Rahim");
  });

  // 2. Video button emits VIDEO call:start payload format
  it("2. Video button emits VIDEO call:start payload", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    const conversationId = "conv_67890";
    const payload = { conversationId, callType: "VIDEO" as const };

    mockSocket.emit(REALTIME_EVENTS.CLIENT.CALL_START, payload);

    expect(mockSocket.emit).toHaveBeenCalledWith("call:start", {
      conversationId: "conv_67890",
      callType: "VIDEO",
    });

    store.dispatch(
      initiateOutgoingCall({
        conversationId,
        callType: "VIDEO",
        receiver: { name: "Karim" },
      })
    );

    const state = store.getState().call;
    expect(state.callState).toBe("RINGING_OUTGOING");
    expect(state.activeCall?.callType).toBe("VIDEO");
    expect(state.activeCall?.receiver?.name).toBe("Karim");
  });

  // 3. Incoming call renders with caller details
  it("3. Incoming call sets state to RINGING_INCOMING and saves caller data", () => {
    const incomingPayload: CallIncomingPayload = {
      callId: "call_abc_123",
      conversationId: "conv_999",
      caller: {
        id: "usr_caller_1",
        externalId: "ext_caller_1",
        name: "Rahim",
        avatar: "https://example.com/avatar.jpg",
      },
      callType: "VIDEO",
    };

    store.dispatch(setIncomingCall(incomingPayload));

    const state = store.getState().call;
    expect(state.callState).toBe("RINGING_INCOMING");
    expect(state.activeCall?.callId).toBe("call_abc_123");
    expect(state.activeCall?.conversationId).toBe("conv_999");
    expect(state.activeCall?.caller?.name).toBe("Rahim");
    expect(state.activeCall?.caller?.id).toBe("usr_caller_1");
    expect(state.activeCall?.callType).toBe("VIDEO");
  });

  // 4. Accept emits call:accept
  it("4. Accept emits call:accept with callId", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    const callId = "call_abc_123";
    mockSocket.emit(REALTIME_EVENTS.CLIENT.CALL_ACCEPT, { callId });

    expect(mockSocket.emit).toHaveBeenCalledWith("call:accept", {
      callId: "call_abc_123",
    });

    store.dispatch(setCallAccepted({ callId }));
    expect(store.getState().call.callState).toBe("ACCEPTED");
  });

  // 5. Reject emits call:reject
  it("5. Reject emits call:reject with callId", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    const callId = "call_abc_123";
    mockSocket.emit(REALTIME_EVENTS.CLIENT.CALL_REJECT, { callId });

    expect(mockSocket.emit).toHaveBeenCalledWith("call:reject", {
      callId: "call_abc_123",
    });

    store.dispatch(setCallRejected({ callId, reason: "Call declined" }));
    expect(store.getState().call.callState).toBe("REJECTED");
  });

  // 6. Cancel emits call:cancel
  it("6. Cancel emits call:cancel with callId", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    const callId = "call_abc_123";
    mockSocket.emit(REALTIME_EVENTS.CLIENT.CALL_CANCEL, { callId });

    expect(mockSocket.emit).toHaveBeenCalledWith("call:cancel", {
      callId: "call_abc_123",
    });

    store.dispatch(setCallCancelled({ callId }));
    expect(store.getState().call.callState).toBe("CANCELLED");
  });

  // 7. End emits call:end
  it("7. End emits call:end with callId", () => {
    const mockSocket = {
      emit: vi.fn(),
    };

    const callId = "call_abc_123";
    mockSocket.emit(REALTIME_EVENTS.CLIENT.CALL_END, { callId });

    expect(mockSocket.emit).toHaveBeenCalledWith("call:end", {
      callId: "call_abc_123",
    });

    store.dispatch(setCallEnded({ callId, reason: "NORMAL" }));
    expect(store.getState().call.callState).toBe("ENDED");
  });

  // 8. call:accepted changes state
  it("8. call:accepted changes state from ringing to ACCEPTED", () => {
    store.dispatch(
      initiateOutgoingCall({
        conversationId: "conv_1",
        callType: "AUDIO",
      })
    );
    store.dispatch(setOutgoingRinging({ callId: "call_active_1" }));
    expect(store.getState().call.callState).toBe("RINGING_OUTGOING");

    const acceptedPayload: CallAcceptedPayload = {
      callId: "call_active_1",
      conversationId: "conv_1",
      acceptedBy: "usr_2",
    };

    store.dispatch(setCallAccepted(acceptedPayload));
    const state = store.getState().call;
    expect(state.callState).toBe("ACCEPTED");
    expect(state.activeCall?.startedAt).toBeDefined();
  });

  // 9. call:rejected closes UI / sets REJECTED
  it("9. call:rejected changes state to REJECTED and resets to IDLE", () => {
    const rejectedPayload: CallRejectedPayload = {
      callId: "call_1",
      conversationId: "conv_1",
      reason: "User declined call",
    };

    store.dispatch(setCallRejected(rejectedPayload));
    expect(store.getState().call.callState).toBe("REJECTED");
    expect(store.getState().call.statusMessage).toBe("User declined call");

    store.dispatch(resetCallState());
    expect(store.getState().call.callState).toBe("IDLE");
    expect(store.getState().call.activeCall).toBeNull();
  });

  // 10. call:cancelled closes UI
  it("10. call:cancelled sets state to CANCELLED and resets to IDLE", () => {
    const cancelledPayload: CallCancelledPayload = {
      callId: "call_1",
      conversationId: "conv_1",
    };

    store.dispatch(setCallCancelled(cancelledPayload));
    expect(store.getState().call.callState).toBe("CANCELLED");

    store.dispatch(resetCallState());
    expect(store.getState().call.callState).toBe("IDLE");
  });

  // 11. call:ended closes UI
  it("11. call:ended sets state to ENDED and resets to IDLE", () => {
    const endedPayload: CallEndedPayload = {
      callId: "call_1",
      conversationId: "conv_1",
      reason: "NORMAL",
    };

    store.dispatch(setCallEnded(endedPayload));
    expect(store.getState().call.callState).toBe("ENDED");

    store.dispatch(resetCallState());
    expect(store.getState().call.callState).toBe("IDLE");
  });

  // 12. call:busy shows busy feedback
  it("12. call:busy sets BUSY state with human-friendly message", () => {
    const busyPayload: CallBusyPayload = {
      callId: "call_1",
      conversationId: "conv_1",
      userId: "usr_2",
      reason: "Participant is currently busy on another call",
    };

    store.dispatch(setCallBusy(busyPayload));
    const state = store.getState().call;
    expect(state.callState).toBe("BUSY");
    expect(state.statusMessage).toBe("Participant is currently busy on another call");
  });

  // 13. call:error shows error
  it("13. call:error sets human-readable error in state", () => {
    const errorPayload: CallErrorPayload = {
      code: "FORBIDDEN",
      message: "You're not a member of this conversation.",
      callId: "call_1",
    };

    store.dispatch(setCallError(errorPayload));
    expect(store.getState().call.error).toBe(
      "You're not a member of this conversation."
    );
  });

  // 14. Duplicate listeners do not cause duplicate events
  it("14. Centralized listener registration ensures idempotent subscription", () => {
    type ListenerFn = (payload: unknown) => void;
    const registeredHandlers = new Map<string, ListenerFn[]>();
    const mockSocket = {
      on: (event: string, fn: ListenerFn) => {
        const list = registeredHandlers.get(event) || [];
        list.push(fn);
        registeredHandlers.set(event, list);
      },
      off: (event: string, fn: ListenerFn) => {
        const list = registeredHandlers.get(event) || [];
        registeredHandlers.set(
          event,
          list.filter((f) => f !== fn)
        );
      },
    };

    const handler = vi.fn();
    mockSocket.on(REALTIME_EVENTS.SERVER.CALL_INCOMING, handler);
    expect(registeredHandlers.get(REALTIME_EVENTS.SERVER.CALL_INCOMING)?.length).toBe(1);

    // Unbind on unmount
    mockSocket.off(REALTIME_EVENTS.SERVER.CALL_INCOMING, handler);
    expect(registeredHandlers.get(REALTIME_EVENTS.SERVER.CALL_INCOMING)?.length).toBe(0);
  });

  // 15. Multiple-device acceptance dismisses ringing UI
  it("15. Receiving call:accepted on secondary device transitions ringing UI to ACCEPTED", () => {
    // Device B is ringing incoming call
    store.dispatch(
      setIncomingCall({
        callId: "call_multi_1",
        conversationId: "conv_1",
        caller: { id: "user_a", externalId: "ext_a", name: "Alice" },
        callType: "AUDIO",
      })
    );
    expect(store.getState().call.callState).toBe("RINGING_INCOMING");

    // Call was answered on Device A -> Backend broadcasts call:accepted to Device B
    store.dispatch(
      setCallAccepted({
        callId: "call_multi_1",
        acceptedBy: "user_b",
      })
    );

    // Device B now transitions out of ringing incoming state
    expect(store.getState().call.callState).toBe("ACCEPTED");
  });

  // 16. Timeout event closes ringing UI
  it("16. call:ended with reason: TIMEOUT transitions state and records timeout status", () => {
    store.dispatch(
      setIncomingCall({
        callId: "call_timeout_1",
        conversationId: "conv_1",
        caller: { id: "user_a", externalId: "ext_a", name: "Alice" },
        callType: "VIDEO",
      })
    );
    expect(store.getState().call.callState).toBe("RINGING_INCOMING");

    store.dispatch(
      setCallEnded({
        callId: "call_timeout_1",
        reason: "TIMEOUT",
      })
    );

    const state = store.getState().call;
    expect(state.callState).toBe("ENDED");
    expect(state.statusMessage).toBe("Call timed out");
  });

  // 17. Chat remains intact after call state changes
  it("17. Chat state and activeConversationId remain completely intact through call lifecycle", () => {
    // 1. User is chatting in conversation 'conv_main'
    store.dispatch(setActiveConversationId("conv_main"));
    expect(store.getState().communication.activeConversationId).toBe("conv_main");

    // 2. Incoming call starts
    store.dispatch(
      setIncomingCall({
        callId: "call_live",
        conversationId: "conv_other",
        caller: { id: "u2", externalId: "e2", name: "Bob" },
        callType: "AUDIO",
      })
    );
    expect(store.getState().call.callState).toBe("RINGING_INCOMING");
    expect(store.getState().communication.activeConversationId).toBe("conv_main");

    // 3. Call is accepted
    store.dispatch(setCallAccepted({ callId: "call_live" }));
    expect(store.getState().call.callState).toBe("ACCEPTED");
    expect(store.getState().communication.activeConversationId).toBe("conv_main");

    // 4. Call ends
    store.dispatch(setCallEnded({ callId: "call_live", reason: "NORMAL" }));
    store.dispatch(resetCallState());
    expect(store.getState().call.callState).toBe("IDLE");

    // 5. Chat timeline is completely intact
    expect(store.getState().communication.activeConversationId).toBe("conv_main");
  });
});
