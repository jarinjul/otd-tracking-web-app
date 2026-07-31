interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
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
