"use client"

import { create } from "zustand"
import type { GanttViewMode } from "@/lib/types"
import { addDays } from "@/lib/utils/date"

interface GanttStore {
  viewMode: GanttViewMode
  groupFilter: string
  personFilter: string
  viewStart: Date
  openProjectId: string | null

  setViewMode: (m: GanttViewMode) => void
  setGroupFilter: (g: string) => void
  setPersonFilter: (p: string) => void
  navigateBack: () => void
  navigateForward: () => void
  goToToday: () => void
  setOpenProjectId: (id: string | null) => void
}

function getDefaultViewStart(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function stepDays(mode: GanttViewMode): number {
  if (mode === "day") return 14
  if (mode === "week") return 28
  return 60
}

export const useGanttStore = create<GanttStore>((set, get) => ({
  viewMode: "month",
  groupFilter: "all",
  personFilter: "all",
  viewStart: getDefaultViewStart(),
  openProjectId: null,

  setViewMode: (m) => set({ viewMode: m }),
  setGroupFilter: (g) => set({ groupFilter: g }),
  setPersonFilter: (p) => set({ personFilter: p }),
  navigateBack: () => set({ viewStart: addDays(get().viewStart, -stepDays(get().viewMode)) }),
  navigateForward: () => set({ viewStart: addDays(get().viewStart, stepDays(get().viewMode)) }),
  goToToday: () => set({ viewStart: getDefaultViewStart() }),
  setOpenProjectId: (id) => set({ openProjectId: id }),
}))
