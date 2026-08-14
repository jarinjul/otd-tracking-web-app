// Hub-and-spoke mark: a central node radiating to six satellites — the Nexus Hub brand icon.
export function NexusIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="12" x2="12" y2="4" />
        <line x1="12" y1="12" x2="18.9" y2="8" />
        <line x1="12" y1="12" x2="18.9" y2="16" />
        <line x1="12" y1="12" x2="12" y2="20" />
        <line x1="12" y1="12" x2="5.1" y2="16" />
        <line x1="12" y1="12" x2="5.1" y2="8" />
      </g>
      <circle cx="12" cy="4" r="1.8" fill="currentColor" />
      <circle cx="18.9" cy="8" r="1.8" fill="currentColor" />
      <circle cx="18.9" cy="16" r="1.8" fill="currentColor" />
      <circle cx="12" cy="20" r="1.8" fill="currentColor" />
      <circle cx="5.1" cy="16" r="1.8" fill="currentColor" />
      <circle cx="5.1" cy="8" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  )
}
