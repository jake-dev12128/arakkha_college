import { redisClient } from "../config/redis.js";

import { generateOtp, hashValue } from "../utils/crypto.js";

import { sendOtpEmail } from "./email.service.js";

// ==================================================
// CONFIGURATION
// ==================================================

const OTP_TTL_SECONDS = 5 * 60;

const OTP_RESEND_COOLDOWN_SECONDS = 60;

const MAX_OTP_ATTEMPTS = 5;

// ==================================================
// OTP PURPOSES
// ==================================================

const OTP_PURPOSES = new Set([ "forgot-password", "reset-password"]);

// ==================================================
// VALIDATE OTP PURPOSE
// ==================================================

const validatePurpose = (purpose) => {
  if (!OTP_PURPOSES.has(purpose)) {
    throw new Error(`Unsupported OTP purpose: ${purpose}`);
  }
};

// ==================================================
// NORMALIZE IDENTIFIER
// ==================================================

const normalizeIdentifier = (identifier) => {
  return String(identifier).trim().toLowerCase();
};
const hashIdentifier = (identifier) => {
  return hashValue(
    normalizeIdentifier(identifier),
  );
};
// ==================================================
// REDIS KEYS
// ==================================================

const getOtpKey = (purpose, identifier) => {
  const identifierHash =
    hashIdentifier(identifier);

  return `otp:${purpose}:${identifierHash}`;
};

const getCooldownKey = (
  purpose,
  identifier,
) => {
  const identifierHash =
    hashIdentifier(identifier);

  return `otp:cooldown:${purpose}:${identifierHash}`;
};
// ==================================================
// ATOMIC OTP VERIFICATION SCRIPT
// ==================================================

const VERIFY_OTP_SCRIPT = `
local stored = redis.call("GET", KEYS[1])

-- OTP does not exist
if not stored then
  return {0, 0}
end


-- Decode JSON
local ok, data = pcall(
  cjson.decode,
  stored
)

-- Invalid Redis data
if not ok or not data then
  redis.call("DEL", KEYS[1])
  return {0, 0}
end


-- OTP is correct
if data.hash == ARGV[1] then

  -- OTP is one-time use
  redis.call("DEL", KEYS[1])

  return {1, 0}
end


-- Current attempts
local attempts =
  tonumber(data.attempts) or 0


-- Increase attempt
attempts = attempts + 1


-- Maximum attempts reached
local maxAttempts =
  tonumber(ARGV[2])


if attempts >= maxAttempts then

  -- Destroy OTP
  redis.call("DEL", KEYS[1])

  return {2, 0}
end


-- Get remaining TTL
local ttl =
  redis.call("TTL", KEYS[1])


-- OTP expired
if ttl <= 0 then

  redis.call("DEL", KEYS[1])

  return {0, 0}
end


-- Update attempts
data.attempts = attempts


-- Save OTP while preserving TTL
redis.call(
  "SET",
  KEYS[1],
  cjson.encode(data),
  "EX",
  ttl
)


-- Return invalid OTP
return {
  3,
  maxAttempts - attempts
}
`;

// ==================================================
// CREATE OTP
// ==================================================

export const createOtp = async ({ purpose, identifier }) => {
  // -----------------------------------------------
  // Validate purpose
  // -----------------------------------------------

  validatePurpose(purpose);

  // -----------------------------------------------
  // Normalize identifier
  // -----------------------------------------------

  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (!normalizedIdentifier) {
    throw new Error("OTP identifier is required.");
  }

  // -----------------------------------------------
  // Redis keys
  // -----------------------------------------------

  const otpKey = getOtpKey(purpose, normalizedIdentifier);

  const cooldownKey = getCooldownKey(purpose, normalizedIdentifier);

  // -----------------------------------------------
  // Atomically claim cooldown
  // -----------------------------------------------

  const cooldownCreated = await redisClient.set(cooldownKey, "1", {
    NX: true,
    EX: OTP_RESEND_COOLDOWN_SECONDS,
  });

  // -----------------------------------------------
  // Cooldown already exists
  // -----------------------------------------------

  if (cooldownCreated !== "OK") {
    const retryAfter = await redisClient.ttl(cooldownKey);

    return {
      success: false,
      reason: "OTP_COOLDOWN",
      retryAfter: Math.max(retryAfter, 0),
    };
  }

  // -----------------------------------------------
  // Generate OTP
  // -----------------------------------------------

  const otp = generateOtp();

  // -----------------------------------------------
  // Hash OTP
  // -----------------------------------------------

  const otpHash = hashValue(otp);

  // -----------------------------------------------
  // OTP Redis data
  // -----------------------------------------------

  const otpData = {
    hash: otpHash,
    attempts: 0,
  };

  try {
    // ---------------------------------------------
    // Store OTP
    // ---------------------------------------------

    await redisClient.set(otpKey, JSON.stringify(otpData), {
      EX: OTP_TTL_SECONDS,
    });

    // ---------------------------------------------
    // Send OTP email
    // ---------------------------------------------

    await sendOtpEmail({
      to: normalizedIdentifier,
      otp,
      purpose,
      expiresIn: OTP_TTL_SECONDS,
    });

    // ---------------------------------------------
    // Success
    // ---------------------------------------------

    return {
      success: true,
      expiresIn: OTP_TTL_SECONDS,
      cooldown: OTP_RESEND_COOLDOWN_SECONDS,
    };
  } catch (error) {
    // ---------------------------------------------
    // Cleanup if something fails
    // ---------------------------------------------

    await redisClient.del(otpKey);

    await redisClient.del(cooldownKey);

    throw error;
  }
};

// ==================================================
// VERIFY OTP
// ==================================================

export const verifyOtp = async ({ purpose, identifier, otp }) => {
  // -----------------------------------------------
  // Validate purpose
  // -----------------------------------------------

  validatePurpose(purpose);

  // -----------------------------------------------
  // Normalize identifier
  // -----------------------------------------------

  const normalizedIdentifier = normalizeIdentifier(identifier);

  // -----------------------------------------------
  // Normalize OTP
  // -----------------------------------------------

  const normalizedOtp = String(otp).trim();

  // -----------------------------------------------
  // Validate identifier
  // -----------------------------------------------

  if (!normalizedIdentifier) {
    return {
      success: false,
      reason: "INVALID_IDENTIFIER",
    };
  }

  // -----------------------------------------------
  // Validate OTP format
  // -----------------------------------------------

  if (!/^\d{6}$/.test(normalizedOtp)) {
    return {
      success: false,
      reason: "INVALID_OTP_FORMAT",
    };
  }

  // -----------------------------------------------
  // Redis OTP key
  // -----------------------------------------------

  const otpKey = getOtpKey(purpose, normalizedIdentifier);

  // -----------------------------------------------
  // Hash incoming OTP
  // -----------------------------------------------

  const incomingHash = hashValue(normalizedOtp);

  // -----------------------------------------------
  // Atomic Redis verification
  // -----------------------------------------------

  const result = await redisClient.eval(VERIFY_OTP_SCRIPT, {
    keys: [otpKey],

    arguments: [incomingHash, String(MAX_OTP_ATTEMPTS)],
  });

  // -----------------------------------------------
  // Redis result
  // -----------------------------------------------

const status = Number(result?.[0] ?? 0); const attemptsRemaining = Number(result?.[1] ?? 0);
  // -----------------------------------------------
  // OTP expired
  // -----------------------------------------------

  if (status === 0) {
    return {
      success: false,
      reason: "OTP_EXPIRED",
    };
  }

  // -----------------------------------------------
  // OTP correct
  // -----------------------------------------------

  if (status === 1) {
    return {
      success: true,
    };
  }

  // -----------------------------------------------
  // Maximum attempts reached
  // -----------------------------------------------

  if (status === 2) {
    return {
      success: false,
      reason: "MAX_ATTEMPTS",
      attemptsRemaining: 0,
    };
  }

  // -----------------------------------------------
  // OTP incorrect
  // -----------------------------------------------

  if (status === 3) {
    return {
      success: false,
      reason: "INVALID_OTP",
      attemptsRemaining,
    };
  }

  // -----------------------------------------------
  // Unexpected Redis result
  // -----------------------------------------------

  return {
    success: false,
    reason: "OTP_INVALID",
  };
};

// ==================================================
// GET OTP STATUS
// ==================================================

export const getOtpStatus = async ({ purpose, identifier }) => {
  validatePurpose(purpose);

  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (!normalizedIdentifier) {
    return {
      otpExists: false,
      expiresIn: 0,
      cooldownActive: false,
      retryAfter: 0,
    };
  }

  const otpKey = getOtpKey(purpose, normalizedIdentifier);

  const cooldownKey = getCooldownKey(purpose, normalizedIdentifier);

  // -----------------------------------------------
  // Check OTP
  // -----------------------------------------------

  const otpExists = await redisClient.exists(otpKey);

  // -----------------------------------------------
  // Check cooldown
  // -----------------------------------------------

  const cooldownExists = await redisClient.exists(cooldownKey);

  let expiresIn = 0;

  let retryAfter = 0;

  // -----------------------------------------------
  // OTP TTL
  // -----------------------------------------------

  if (otpExists) {
    expiresIn = await redisClient.ttl(otpKey);
  }

  // -----------------------------------------------
  // Cooldown TTL
  // -----------------------------------------------

  if (cooldownExists) {
    retryAfter = await redisClient.ttl(cooldownKey);
  }

  return {
    otpExists: Boolean(otpExists),

    expiresIn: Math.max(expiresIn, 0),

    cooldownActive: Boolean(cooldownExists),

    retryAfter: Math.max(retryAfter, 0),
  };
};

// ==================================================
// DELETE OTP
// ==================================================

export const deleteOtp = async ({ purpose, identifier }) => {
  validatePurpose(purpose);

  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (!normalizedIdentifier) {
    return;
  }

  const otpKey = getOtpKey(purpose, normalizedIdentifier);

  await redisClient.del(otpKey);
};
