/** Pick the most relevant release for a project: in-progress > planned > deployed > other, tie-broken by most recent start date. */
export function pickActiveRelease<T extends { status: string; startDate: Date | string | null }>(
  releases: T[]
): T | null {
  if (releases.length === 0) return null
  const rank = (r: T) => (r.status === "in_progress" ? 0 : r.status === "planned" ? 1 : r.status === "deployed" ? 2 : 3)
  return [...releases].sort((a, b) => {
    const rd = rank(a) - rank(b)
    if (rd !== 0) return rd
    const at = a.startDate ? new Date(a.startDate).getTime() : 0
    const bt = b.startDate ? new Date(b.startDate).getTime() : 0
    return bt - at
  })[0]
}
