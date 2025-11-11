"use client";

import { create } from "zustand";

export interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  voiceUrl?: string;
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  addMessage: (msg: Message) => void;
  setTyping: (state: boolean) => void;
  clearMessages: () => void;
  updateMessage: (id: string, patch: Partial<Message>) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setTyping: (state) => set({ isTyping: state }),
  clearMessages: () => set({ messages: [] }),
  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
}));

