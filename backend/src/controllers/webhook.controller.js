import { verifyWebhook } from "@clerk/express/webhooks";

import WebhookEvent from "../models/webhookEvent.model.js";

import {
  syncClerkUser,
  deactivateClerkUser,
} from "../services/webhook.service.js";

import logger from "../utils/logger.js";

const STALE_PROCESSING_MS = 5 * 60 * 1000;

const claimWebhookEvent = async ({ eventId, eventType }) => {
  try {
    return {
      event: await WebhookEvent.create({
        eventId,
        eventType,
        status: "PROCESSING",
      }),
      claimed: true,
    };
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    const existing = await WebhookEvent.findOne({ eventId });

    if (!existing) {
      throw error;
    }

    if (existing.status === "PROCESSED") {
      return { event: existing, claimed: false, duplicate: true };
    }

    const isStale =
      Date.now() - new Date(existing.updatedAt).getTime() >
      STALE_PROCESSING_MS;

    if (existing.status === "PROCESSING" && !isStale) {
      return { event: existing, claimed: false, inProgress: true };
    }

    const claimedEvent = await WebhookEvent.findOneAndUpdate(
      {
        _id: existing._id,
        status: { $in: ["FAILED", "PROCESSING"] },
        ...(existing.status === "PROCESSING"
          ? { updatedAt: existing.updatedAt }
          : {}),
      },
      {
        $set: {
          status: "PROCESSING",
          lastError: null,
        },
      },
      { new: true },
    );

    if (!claimedEvent) {
      const latest = await WebhookEvent.findOne({ eventId });

      if (latest?.status === "PROCESSED") {
        return { event: latest, claimed: false, duplicate: true };
      }

      return { event: latest, claimed: false, inProgress: true };
    }

    return { event: claimedEvent, claimed: true };
  }
};

export const handleClerkWebhook = async (req, res) => {
  let evt;
  let webhookEvent;

  // Signature verification failures are client/input failures.
  try {
    evt = await verifyWebhook(req);
  } catch (error) {
    logger.warn(
      "Clerk webhook signature verification failed:",
      error?.message,
    );

    return res.status(400).json({
      success: false,
      message: "Invalid webhook",
    });
  }

  if (!evt?.id) {
    logger.warn("Clerk webhook missing event ID");

    return res.status(400).json({
      success: false,
      message: "Invalid webhook",
    });
  }

  try {
    const claim = await claimWebhookEvent({
      eventId: evt.id,
      eventType: evt.type,
    });

    webhookEvent = claim.event;

    if (claim.duplicate) {
      return res.status(200).json({
        success: true,
        message: "Webhook already processed",
      });
    }

    if (claim.inProgress) {
      return res.status(200).json({
        success: true,
        message: "Webhook is already being processed",
      });
    }

    logger.info(`Clerk webhook received: ${evt.type}`);

    switch (evt.type) {
      case "user.updated":
        await syncClerkUser(evt.data);
        break;

      case "user.deleted":
        await deactivateClerkUser(evt.data.id);
        break;

      default:
        logger.info(`Unhandled Clerk event: ${evt.type}`);
        break;
    }

    await WebhookEvent.findByIdAndUpdate(webhookEvent._id, {
      $set: {
        status: "PROCESSED",
        processedAt: new Date(),
        lastError: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error) {
    if (webhookEvent?._id) {
      try {
        await WebhookEvent.findByIdAndUpdate(webhookEvent._id, {
          $set: {
            status: "FAILED",
            lastError:
              error?.message?.slice(0, 500) ||
              "Webhook processing failed",
          },
        });
      } catch (persistError) {
        logger.error(
          "Failed to persist webhook failure state:",
          persistError?.message,
        );
      }
    }

    // Return 5xx so Clerk can retry transient processing failures.
    logger.error(
      "Clerk webhook processing failed:",
      error?.message,
    );

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};
