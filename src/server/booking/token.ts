import { createHash, randomBytes } from "node:crypto";

/** SHA-256 hex of a manage token; the only form stored in `bookings.manage_token_hash`. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A fresh 32-byte manage token (base64url) and its hash. */
export function newManageToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}
