interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE = {
  sm: "w-6 h-6 min-w-6 min-h-6 text-xs shrink-0",
  md: "w-8 h-8 min-w-8 min-h-8 text-sm shrink-0",
  lg: "w-10 h-10 min-w-10 min-h-10 text-base shrink-0",
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

const COLORS = [
  "bg-accent text-white",
  "bg-rag-green text-white",
  "bg-rag-amber text-white",
  "bg-rag-red text-white",
  "bg-purple-500 text-white",
  "bg-pink-500 text-white",
]

function colorFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export function Avatar({ name, avatarUrl, size = "md", className = "" }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${SIZE[size]} rounded-full object-cover ${className}`}
      />
    )
  }
  return (
    <div
      className={`${SIZE[size]} rounded-full flex items-center justify-center font-semibold ${colorFor(name)} ${className}`}
      title={name}
    >
      {initials(name)}
    </div>
  )
}
