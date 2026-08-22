export const AVATAR_MAX_CHARS = 150_000
export const AVATAR_SIZE_PX = 128

/** Crop to a centered square, downscale to AVATAR_SIZE_PX, and encode as a JPEG data URI —
 * small enough to store directly on a text column, no external file storage needed. */
export function cropSquareImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = AVATAR_SIZE_PX
        canvas.height = AVATAR_SIZE_PX
        const ctx = canvas.getContext("2d")
        if (!ctx) { reject(new Error("Canvas not supported")); return }
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX)
        resolve(canvas.toDataURL("image/jpeg", 0.8))
      }
      img.onerror = () => reject(new Error("Invalid image file"))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error("Could not read file"))
    reader.readAsDataURL(file)
  })
}
