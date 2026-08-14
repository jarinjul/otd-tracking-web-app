import { createHash } from "crypto"

export const AUTH_COOKIE = "nexus_auth"

// Cookie holds a hash of the shared password, not the password itself.
export function authToken(): string {
  return createHash("sha256").update(process.env.APP_PASSWORD ?? "").digest("hex")
}
