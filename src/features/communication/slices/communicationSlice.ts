// src/features/communication/slices/communicationSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CommunicationUIState {
  activeConversationId: string | null;
  isMobileChatOpen: boolean;
  isSidebarCollapsed: boolean;
  searchQuery: string;
  editingMessage: {
    id: string;
    conversationId: string;
    content: string;
  } | null;
  connectionStatus: "connected" | "connecting" | "disconnected";
}

const initialState: CommunicationUIState = {
  activeConversationId: null,
  isMobileChatOpen: false,
  isSidebarCollapsed: false,
  searchQuery: "",
  editingMessage: null,
  connectionStatus: "disconnected",
};

export const communicationSlice = createSlice({
  name: "communication",
  initialState,
  reducers: {
    setActiveConversationId: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
      if (action.payload) {
        state.isMobileChatOpen = true;
      }
      // Reset editing message when switching conversations
      state.editingMessage = null;
    },
    setIsMobileChatOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileChatOpen = action.payload;
    },
    toggleSidebarCollapsed: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setEditingMessage: (
      state,
      action: PayloadAction<{ id: string; conversationId: string; content: string } | null>
    ) => {
      state.editingMessage = action.payload;
    },
    setConnectionStatus: (
      state,
      action: PayloadAction<"connected" | "connecting" | "disconnected">
    ) => {
      state.connectionStatus = action.payload;
    },
    resetCommunicationUI: (state) => {
      state.activeConversationId = null;
      state.isMobileChatOpen = false;
      state.isSidebarCollapsed = false;
      state.searchQuery = "";
      state.editingMessage = null;
    },
  },
});

export const {
  setActiveConversationId,
  setIsMobileChatOpen,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  setSearchQuery,
  setEditingMessage,
  setConnectionStatus,
  resetCommunicationUI,
} = communicationSlice.actions;

export default communicationSlice.reducer;
