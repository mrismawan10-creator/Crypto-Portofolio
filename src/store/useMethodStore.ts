"use client";

import { create } from "zustand";

interface MethodState {
  method: string;
  setMethod: (m: string) => void;
}

export const METHOD_OPTIONS = [
  "journal assistant",
  "feynman method",
  "hegelian style",
  "socratic method",
  "consultant finance",
];

export const useMethodStore = create<MethodState>((set) => ({
  method: METHOD_OPTIONS[0],
  setMethod: (m) => set({ method: m }),
}));
