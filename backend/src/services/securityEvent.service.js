
import SecurityEvent, {
  SECURITY_EVENT_TYPES,
} from "../models/securityEvent.model.js";

import AppError from "../utils/AppError.js";

export const createSecurityEvent = async ({
  userId = null,
  eventType,
  ipAddress = null,
  userAgent = null,
  deviceId = null,
  metadata = null,
  idempotencyKey = undefined,
}) => {
  if (!eventType) {
    throw new AppError(
      "Security event type is required.",
      400,
      "SECURITY_EVENT_TYPE_REQUIRED"
    );
  }

  if (!SECURITY_EVENT_TYPES.includes(eventType)) {
    throw new AppError(
      "Invalid security event type.",
      400,
      "INVALID_SECURITY_EVENT_TYPE"
    );
  }

  if (
    idempotencyKey !== undefined &&
    (
      typeof idempotencyKey !== "string" ||
      !idempotencyKey.trim() ||
      idempotencyKey.length > 255
    )
  ) {
    throw new AppError(
      "Invalid security event idempotency key.",
      400,
      "INVALID_SECURITY_EVENT_IDEMPOTENCY_KEY"
    );
  }

  const payload = {
    userId,
    eventType,
    ipAddress,
    userAgent,
    deviceId,
    metadata,
  };

  if (idempotencyKey === undefined) {
    try {
      return await SecurityEvent.create(payload);
    } catch (error) {
      throw new AppError(
        "Unable to create security event.",
        500,
        "SECURITY_EVENT_CREATION_FAILED",
        { cause: error }
      );
    }
  }

  try {
    const result = await SecurityEvent.findOneAndUpdate(
      { idempotencyKey },
      {
        $setOnInsert: {
          ...payload,
          idempotencyKey,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    // Never silently reuse a key for another event.
    if (
      result.eventType !== eventType ||
      String(result.userId) !== String(userId)
    ) {
      throw new AppError(
        "Security event idempotency conflict.",
        409,
        "SECURITY_EVENT_IDEMPOTENCY_CONFLICT"
      );
    }

    return result;
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await SecurityEvent.findOne({
        idempotencyKey,
      });

      if (
        existing &&
        existing.eventType === eventType &&
        String(existing.userId) === String(userId)
      ) {
        return existing;
      }

      throw new AppError(
        "Security event idempotency conflict.",
        409,
        "SECURITY_EVENT_IDEMPOTENCY_CONFLICT"
      );
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Unable to create security event.",
      500,
      "SECURITY_EVENT_CREATION_FAILED",
      { cause: error }
    );
  }
};
