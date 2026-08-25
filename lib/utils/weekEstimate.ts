// Week view (Resource Planning page) is a read-only ESTIMATE lens: no weekly data is ever stored,
// it's derived client-side from the same monthly ReleaseWorkload entries the Workload page uses.
// See docs/RESOURCE-PLANNING.md "Week view" for the spec this implements.
import { addDays } from "./date"

export interface WeekBucket {
  key: string // "YYYY-MM-DD" of the Monday, used as a stable identity
  start: Date // Monday, local midnight
  end: Date // Sunday, local midnight (inclusive)
}

function isWeekday(d: Date): boolean {
  const day = d.getDay()
  return day !== 0 && day !== 6
}

// Inclusive workday count between two local-midnight dates.
function countWorkdays(start: Date, end: Date): number {
  if (start > end) return 0
  let count = 0
  let cur = new Date(start)
  while (cur <= end) {
    if (isWeekday(cur)) count++
    cur = addDays(cur, 1)
  }
  return count
}

function overlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): { start: Date; end: Date } | null {
  const start = aStart > bStart ? aStart : bStart
  const end = aEnd < bEnd ? aEnd : bEnd
  if (start > end) return null
  return { start, end }
}

function weekKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Every Monday-Sunday week bucket whose range overlaps [rangeStart, rangeEnd] (inclusive, local dates). */
export function buildWeekBuckets(rangeStart: Date, rangeEnd: Date): WeekBucket[] {
  const day = rangeStart.getDay()
  const diff = day === 0 ? -6 : 1 - day
  let cursor = addDays(rangeStart, diff)
  cursor.setHours(0, 0, 0, 0)

  const buckets: WeekBucket[] = []
  while (cursor <= rangeEnd) {
    const end = addDays(cursor, 6)
    buckets.push({ key: weekKey(cursor), start: cursor, end })
    cursor = addDays(cursor, 7)
  }
  return buckets
}

/**
 * Distribute H hours of one (release, person, month) entry across the given week buckets.
 * Active window = overlap of [releaseStart, releaseEnd] with the entry's month (whole month if the
 * release has no dates). Hours are spread evenly per workday in that window, so a release active
 * only in the back half of a month piles its hours into that month's later weeks instead of being
 * smeared evenly across the whole month.
 */
export function distributeMonthlyHoursToWeeks(
  hours: number,
  monthKeyStr: string, // "YYYY-MM"
  releaseStart: Date | null,
  releaseEnd: Date | null,
  weeks: WeekBucket[]
): Record<string, number> {
  const [y, m] = monthKeyStr.split("-").map(Number)
  const monthStart = new Date(y, m - 1, 1)
  const monthEnd = new Date(y, m, 0)

  let windowStart = monthStart
  let windowEnd = monthEnd
  if (releaseStart && releaseEnd) {
    const ov = overlap(releaseStart, releaseEnd, monthStart, monthEnd)
    if (ov) {
      windowStart = ov.start
      windowEnd = ov.end
    }
  }

  let workdays = countWorkdays(windowStart, windowEnd)
  if (workdays === 0) {
    // Window collapsed to a weekend-only stretch (or zero-length) — fall back to the whole month
    // so we don't divide by zero, per spec.
    windowStart = monthStart
    windowEnd = monthEnd
    workdays = countWorkdays(monthStart, monthEnd)
  }
  const hoursPerDay = workdays > 0 ? hours / workdays : 0

  const result: Record<string, number> = {}
  if (hoursPerDay === 0) return result
  for (const w of weeks) {
    const ov = overlap(windowStart, windowEnd, w.start, w.end)
    if (!ov) continue
    const wd = countWorkdays(ov.start, ov.end)
    if (wd === 0) continue
    result[w.key] = hoursPerDay * wd
  }
  return result
}

/** "W35 · 25–31 Aug" — ISO-ish week number (matches lib/utils/date.ts ganttWeekLabel) + date range. */
export function weekLabel(bucket: WeekBucket): string {
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const yearStart = new Date(bucket.start.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((bucket.start.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7)
  const sameMonth = bucket.start.getMonth() === bucket.end.getMonth()
  const range = sameMonth
    ? `${bucket.start.getDate()}–${bucket.end.getDate()} ${MONTH_NAMES[bucket.start.getMonth()]}`
    : `${bucket.start.getDate()} ${MONTH_NAMES[bucket.start.getMonth()]}–${bucket.end.getDate()} ${MONTH_NAMES[bucket.end.getMonth()]}`
  return `W${weekNum} · ${range}`
}
