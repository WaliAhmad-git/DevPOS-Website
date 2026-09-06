/**
 * Server-only license key generation.
 *
 * This mirrors backend/licensing.py's Fibonacci cipher EXACTLY (same
 * SAFE_CHARS alphabet, same FIBONACCI offsets, same DATE/TOKEN positions)
 * so keys generated here validate against the existing desktop app's
 * verify_license(). Per the build spec (§6): reuse the existing scheme,
 * don't invent a second one.
 *
 * IMPORTANT: import this only from server-side code (API route handlers).
 * Never import it from a "use client" component — that would bundle
 * LICENSE_SECRET_TOKENS into client-side JS and leak the same secret the
 * desktop app relies on for validation.
 */

const PREFIX = "MFUK";
const SAFE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 chars
const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
const DATE_POSITIONS: Record<number, "day_tens" | "day_units" | "month_tens" | "month_units"> = {
  0: "day_tens",
  3: "day_units",
  6: "month_tens",
  9: "month_units",
};
const TOKEN_POSITIONS = [1, 2, 4, 5, 7, 8, 10, 11];
const DIGIT_ALPHABET = SAFE_CHARS.slice(0, 10);
const LICENSE_PERIOD_DAYS = 365;

// Loaded from env (LICENSE_SECRET_TOKENS, comma-separated) so the real
// 10-token pool never has to live in source control for this repo.
// Must be copied verbatim from backend/licensing.py's SECRET_TOKENS list —
// pick any consistent subset/order between the two systems, they just need
// to agree on which strings count as valid tokens.
function getSecretTokens(): string[] {
  const raw = process.env.LICENSE_SECRET_TOKENS ?? "";
  const tokens = raw.split(",").map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) {
    throw new Error(
      "LICENSE_SECRET_TOKENS is not set. Copy tokens from backend/licensing.py's " +
        "SECRET_TOKENS before issuing real license keys."
    );
  }
  return tokens;
}

function fibonacciEncrypt(plain12: string): string {
  const n = SAFE_CHARS.length;
  let out = "";
  for (let i = 0; i < plain12.length; i++) {
    const plainIndex = SAFE_CHARS.indexOf(plain12[i]);
    const encIndex = (plainIndex + FIBONACCI[i]) % n;
    out += SAFE_CHARS[encIndex];
  }
  return out;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Builds one valid MFUK-XXXX-XXXX-XXXX-YYYY key for the given activation
 * date and secret-token index. Returns the dashed, display-ready string.
 */
export function generateLicenseKey(activationDate: Date, tokenIndex?: number): {
  keyString: string;
  activationDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  tokenIndex: number;
} {
  const tokens = getSecretTokens();
  const idx = tokenIndex ?? Math.floor(Math.random() * tokens.length);
  const token = tokens[idx];
  if (token.length !== 8 || [...token].some((c) => !SAFE_CHARS.includes(c))) {
    throw new Error(`Secret token at index ${idx} is not 8 valid SAFE_CHARS characters.`);
  }

  const day = activationDate.getDate();
  const month = activationDate.getMonth() + 1;
  const year = activationDate.getFullYear();

  const dayStr = pad2(day);
  const monthStr = pad2(month);

  // Build the 12-char plaintext block: date digits at DATE_POSITIONS,
  // token characters at TOKEN_POSITIONS, in order.
  const plain = new Array<string>(12);
  plain[0] = DIGIT_ALPHABET[Number(dayStr[0])];
  plain[3] = DIGIT_ALPHABET[Number(dayStr[1])];
  plain[6] = DIGIT_ALPHABET[Number(monthStr[0])];
  plain[9] = DIGIT_ALPHABET[Number(monthStr[1])];
  TOKEN_POSITIONS.forEach((pos, i) => {
    plain[pos] = token[i];
  });

  const plain12 = plain.join("");
  const middle12 = fibonacciEncrypt(plain12);
  const yearStr = String(year);

  const keyString = `${PREFIX}-${middle12.slice(0, 4)}-${middle12.slice(4, 8)}-${middle12.slice(8, 12)}-${yearStr}`;

  const expiry = new Date(activationDate);
  expiry.setDate(expiry.getDate() + LICENSE_PERIOD_DAYS);

  return {
    keyString,
    activationDate: activationDate.toISOString().slice(0, 10),
    expiryDate: expiry.toISOString().slice(0, 10),
    tokenIndex: idx,
  };
}
