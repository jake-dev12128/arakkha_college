import crypto from "node:crypto";

// ==================================================
// RANDOM BYTES
// ==================================================

export const generateRandomBytes = (size = 32) => {
  return crypto.randomBytes(size);
};

// ==================================================
// RANDOM HEX
// ==================================================

export const generateRandomHex = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

// ==================================================
// OTP
// ==================================================

export const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// ==================================================
// SHA-256 HASH
// ==================================================

export const hashValue = (value) => {
  return crypto.createHash("sha256").update(value).digest("hex");
};

// ==================================================
// TIMING-SAFE COMPARISON
// ==================================================

export const safeCompare = (valueA, valueB) => {
  const bufferA = Buffer.from(valueA);
  const bufferB = Buffer.from(valueB);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
};
