"use client"

import { create } from "zustand"

interface PeopleStore {
  deptFilter: string
  roleFilter: string
  activeOnly: boolean
  searchQuery: string

  setDeptFilter: (d: string) => void
  setRoleFilter: (r: string) => void
  setActiveOnly: (v: boolean) => void
  setSearchQuery: (q: string) => void
}

export const usePeopleStore = create<PeopleStore>((set) => ({
  deptFilter: "all",
  roleFilter: "all",
  activeOnly: false,
  searchQuery: "",

  setDeptFilter: (d) => set({ deptFilter: d }),
  setRoleFilter: (r) => set({ roleFilter: r }),
  setActiveOnly: (v) => set({ activeOnly: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}))
