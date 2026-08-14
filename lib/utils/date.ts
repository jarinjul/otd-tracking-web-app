export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export function countdownLabel(deadline: Date | string): string {
  const d = typeof deadline === "string" ? new Date(deadline) : deadline
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = daysBetween(today, d)
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return "Due today"
  if (days === 1) return "Due tomorrow"
  return `${days} days left`
}

export function isOverdue(deadline: Date | string): boolean {
  const d = typeof deadline === "string" ? new Date(deadline) : deadline
  return d < new Date()
}

/** Start of the week (Monday) containing the given date */
export function weekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Start of the month containing the given date */
export function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** Add days to a date */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Format a date as YYYY-MM-DD using its LOCAL calendar date (not UTC).
 * Use this instead of `date.toISOString().slice(0, 10)`, which shifts the
 * date for any positive UTC offset (e.g. midnight local in GMT+7 becomes
 * the previous day in UTC).
 */
export function toDateParam(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Parse a YYYY-MM-DD string as a LOCAL midnight Date (not UTC midnight).
 * Use this instead of `new Date("YYYY-MM-DD")`, which the JS spec parses
 * as UTC and can land on the wrong local calendar day.
 */
export function parseDateParam(param: string): Date {
  const [y, m, d] = param.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/**
 * Parse a YYYY-MM-DD string as UTC midnight. Server-only — use this (not
 * parseDateParam above) anywhere a Date gets stored/queried against the DB,
 * since API routes run on both a GMT+7 dev machine and Vercel's UTC servers
 * and both must produce the exact same instant for the same calendar day.
 */
export function parseDateParamUTC(param: string): Date {
  const [y, m, d] = param.split("-").map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

/** Format month label for Gantt header */
export function ganttMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

/** Week label: W1, W2… within the year */
export function ganttWeekLabel(date: Date): string {
  const start = new Date(date.getFullYear(), 0, 1)
  const week = Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return `W${week}`
}
