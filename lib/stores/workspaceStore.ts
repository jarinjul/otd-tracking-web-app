"use client"

import { create } from "zustand"

interface WorkspaceStore {
  activeTab: "sandbox" | "prd"
  setActiveTab: (t: "sandbox" | "prd") => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  activeTab: "sandbox",
  setActiveTab: (t) => set({ activeTab: t }),
}))
