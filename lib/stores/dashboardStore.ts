"use client"

import { create } from "zustand"
import type { FilterStatus, SortMode } from "@/lib/types"

interface DashboardStore {
  activeBucket: string
  filterStatus: FilterStatus
  filterPhase: string
  filterPerson: string
  sortMode: SortMode
  searchQuery: string
  openProjectId: string | null

  setActiveBucket: (b: string) => void
  setFilterStatus: (s: FilterStatus) => void
  setFilterPhase: (p: string) => void
  setFilterPerson: (p: string) => void
  setSortMode: (m: SortMode) => void
  setSearchQuery: (q: string) => void
  setOpenProjectId: (id: string | null) => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  activeBucket: "all",
  filterStatus: "all",
  filterPhase: "all",
  filterPerson: "all",
  sortMode: "critical_first",
  searchQuery: "",
  openProjectId: null,

  setActiveBucket: (b) => set({ activeBucket: b, filterStatus: "all" }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  setFilterPhase: (p) => set({ filterPhase: p }),
  setFilterPerson: (p) => set({ filterPerson: p }),
  setSortMode: (m) => set({ sortMode: m }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setOpenProjectId: (id) => set({ openProjectId: id }),
}))
