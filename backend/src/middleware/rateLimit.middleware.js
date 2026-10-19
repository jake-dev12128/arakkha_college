import crypto from "node:crypto";

import { redisClient } from "../config/redis.js";
import logger from "../utils/logger.js";

// ==================================================
// HASH IDENTIFIER
// ==================================================

const hashIdentifier = (value) => {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
};

// ==================================================
// GET CLIENT IP
// ==================================================

const getClientIp = (req) => {
  return req.ip || "unknown";
};

// ==================================================
// GET EMAIL
// ==================================================

const getEmail = (req) => {
  const email = req.body?.email;

  if (
    typeof email !== "string" ||
    !email.trim()
  ) {
    return null;
  }

  return email
    .trim()
    .toLowerCase();
};

const RATE_LIMIT_SCRIPT = `
  local current = redis.call("INCR", KEYS[1])

  if current == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
  end

  local ttl = redis.call("TTL", KEYS[1])

  return { current, ttl }
`;

// ==================================================
// CREATE RATE LIMITER
// ==================================================

export const createRateLimiter = ({
  name,
  limit,
  windowSeconds,
  keyGenerator,
  failOpen = true,
}) => {
  return async (
    req,
    res,
    next,
  ) => {
    try {
      // ==============================================
      // GET IDENTIFIER
      // ==============================================

      const identifier = keyGenerator
        ? keyGenerator(req)
        : getClientIp(req);

      // ==============================================
      // HASH IDENTIFIER
      // ==============================================

      const hashedIdentifier =
        hashIdentifier(identifier);

      // ==============================================
      // REDIS KEY
      // ==============================================

      const key =
        `rate-limit:${name}:${hashedIdentifier}`;

      // ==============================================
      // EXECUTE REDIS SCRIPT
      // ==============================================

      const result =
        await redisClient.eval(
          RATE_LIMIT_SCRIPT,
          {
            keys: [key],

            arguments: [
              String(windowSeconds),
            ],
          },
        );

      // ==============================================
      // REDIS RESULT
      // ==============================================

      const currentCount =
        Number(result[0]);

      const ttl = Math.max(
        Number(result[1]),
        0,
      );

      // ==============================================
      // REMAINING REQUESTS
      // ==============================================

      const remaining = Math.max(
        limit - currentCount,
        0,
      );

      // ==============================================
      // RATE LIMIT HEADERS
      // ==============================================

      res.setHeader(
        "RateLimit-Limit",
        String(limit),
      );

      res.setHeader(
        "RateLimit-Remaining",
        String(remaining),
      );

      res.setHeader(
        "RateLimit-Reset",
        String(ttl),
      );

      // ==============================================
      // LIMIT EXCEEDED
      // ==============================================

      if (currentCount > limit) {
        res.setHeader(
          "Retry-After",
          String(ttl),
        );

        return res.status(429).json({
          success: false,

          message:
            "Too many requests. Please try again later.",

          code:
            "RATE_LIMIT_EXCEEDED",

          retryAfter: ttl,
        });
      }

      // ==============================================
      // CONTINUE
      // ==============================================

      return next();
    } catch (error) {
      // ==============================================
      // LOG SERVER-SIDE ONLY
      // ==============================================

      logger.error("Rate limiter failed", {
        limiter: name,
        message: error?.message,
        code: error?.code,
      });

      // ==============================================
      // FAIL OPEN
      // ==============================================

      if (failOpen) {
        return next();
      }

      // ==============================================
      // FAIL CLOSED
      // ==============================================

      return res.status(503).json({
        success: false,

        message:
          "Authentication service is temporarily unavailable.",

        code:
          "RATE_LIMIT_SERVICE_UNAVAILABLE",
      });
    }
  };
};

// ==================================================
// GENERAL RATE LIMITER
// ==================================================

export const generalRateLimiter =
  createRateLimiter({
    name: "general",

    limit: 100,

    windowSeconds: 60,

    keyGenerator: (req) =>
      getClientIp(req),

    failOpen: true,
  });

// ==================================================
// AUTH RATE LIMITER
// ==================================================

export const authRateLimiter =
  createRateLimiter({
    name: "auth",

    limit: 10,

    windowSeconds: 60,

    keyGenerator: (req) =>
      getClientIp(req),

    failOpen: false,
  });


// ==================================================
// STRICT RATE LIMITER
// ==================================================

export const strictRateLimiter =
  createRateLimiter({
    name: "strict",

    limit: 5,

    windowSeconds: 60,

    keyGenerator: (req) =>
      getClientIp(req),

    failOpen: false,
  });

// ==================================================
// EMAIL RATE LIMITER
// ==================================================

export const emailRateLimiter =
  createRateLimiter({
    name: "email",

    limit: 5,

    windowSeconds: 10 * 60,

    keyGenerator: (req) => {
      return (
        getEmail(req) ||
        getClientIp(req)
      );
    },

    failOpen: false,
  });

// ==================================================
// OTP REQUEST RATE LIMITER
// ==================================================

export const otpRequestRateLimiter =
  createRateLimiter({
    name: "otp-request",

    limit: 3,

    windowSeconds: 10 * 60,

    keyGenerator: (req) => {
      return (
        getEmail(req) ||
        getClientIp(req)
      );
    },

    failOpen: false,
  });

// ==================================================
// OTP VERIFY RATE LIMITER
// ==================================================

export const otpVerifyRateLimiter =
  createRateLimiter({
    name: "otp-verify",

    limit: 5,

    windowSeconds: 10 * 60,

    keyGenerator: (req) => {
      return (
        getEmail(req) ||
        getClientIp(req)
      );
    },

    failOpen: false,
  });