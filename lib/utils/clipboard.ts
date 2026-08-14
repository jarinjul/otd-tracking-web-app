/** Copy rich HTML to the clipboard so pasting into a mail client keeps formatting, with a plain-text fallback. */
export async function copyHtmlToClipboard(html: string, plainText: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      })
      await navigator.clipboard.write([item])
      return true
    }
  } catch {
    // fall through to plain-text copy
  }
  try {
    await navigator.clipboard.writeText(plainText)
    return true
  } catch {
    return false
  }
}
