import "server-only";
import crypto from "node:crypto";

export interface UnsubscribeVerifyResult {
  valid: boolean;
  userId?: string;
  reason?: string;
}

function getSigningSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("BETTER_AUTH_SECRET is required to sign digest unsubscribe tokens");
  }
  return secret;
}

/**
 * Generates an HMAC-SHA256 signed unsubscribe token bound to `userId` and expiry.
 */
export function createDigestUnsubscribeToken(
  userId: string,
  ttlSeconds = 30 * 24 * 3600
): string {
  const expSec = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}.${expSec}`;
  const sig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

/**
 * Verifies an HMAC-SHA256 digest unsubscribe token in constant time.
 */
export function verifyDigestUnsubscribeToken(token: string): UnsubscribeVerifyResult {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "Missing token" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "Malformed token" };
  }

  const [userId, expStr, sigHex] = parts;
  if (!userId || !/^\d+$/.test(expStr) || !/^[0-9a-f]+$/i.test(sigHex)) {
    return { valid: false, reason: "Malformed token fields" };
  }

  const expSec = Number(expStr);
  if (!Number.isFinite(expSec) || expSec < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: "Token expired" };
  }

  let expectedHex: string;
  try {
    expectedHex = crypto
      .createHmac("sha256", getSigningSecret())
      .update(`${userId}.${expStr}`)
      .digest("hex");
  } catch {
    return { valid: false, reason: "Signing secret unavailable" };
  }

  const sigBuf = Buffer.from(sigHex, "hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");
  if (sigBuf.length !== expectedBuf.length) {
    return { valid: false, reason: "Invalid token signature" };
  }

  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, reason: "Invalid token signature" };
  }

  return { valid: true, userId };
}
