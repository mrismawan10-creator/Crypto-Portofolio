"use client";

import { create } from "zustand";

interface SessionState {
  userId: string;
  resetSession: () => void;
  ensureSession: () => string;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  userId: "",
  resetSession: () => set({ userId: crypto.randomUUID() }),
  ensureSession: () => {
    const current = get().userId;
    if (current) return current;
    const id = crypto.randomUUID();
    set({ userId: id });
    return id;
  },
}));

