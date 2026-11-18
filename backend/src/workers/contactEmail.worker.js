
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import Contact from "../models/contact.model.js";

import ContactNotification, {
  CONTACT_NOTIFICATION_LEASE_MS,
} from "../models/contactNotification.model.js";

import { resend } from "../config/resend.js";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";

// ==========================================
// ACC CONTACT EMAIL WORKER
// ==========================================

const POLL_INTERVAL_MS = 15_000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;

// Keep the request timeout shorter than the
// MongoDB processing lease.
const SEND_TIMEOUT_MS = Math.min(
  30_000,
  CONTACT_NOTIFICATION_LEASE_MS - 10_000
);

const WORKER_ID = randomUUID();

let timer = null;
let runningPromise = null;
let stopped = true;

// ==========================================
// ERROR HELPERS
// ==========================================

const safeMessage = (error) =>
  String(
    error?.message || "Email delivery failed."
  ).slice(0, 500);

const safeCode = (error) =>
  String(
    error?.name ||
    error?.code ||
    "EMAIL_SEND_ERROR"
  ).slice(0, 100);

const statusCodeOf = (error) => {
  const value = Number(
    error?.statusCode ?? error?.status
  );

  return Number.isInteger(value)
    ? value
    : null;
};

const isPermanentError = (error) => {
  const status = statusCodeOf(error);

  // Authentication, invalid request, forbidden
  // sender or invalid recipient.
  if ([400, 401, 403, 404, 422].includes(status)) {
    return true;
  }

  // Rate limits and server errors are retryable.
  // Unknown network failures are also retryable.
  return false;
};

const retryDelay = (attempt) => {
  const exponential = Math.min(
    MAX_BACKOFF_MS,
    30_000 * 2 ** Math.max(0, attempt - 1)
  );

  return Math.round(
    exponential * (0.8 + Math.random() * 0.4)
  );
};

// ==========================================
// JOB OWNERSHIP
// ==========================================

const ownershipFilter = (job) => ({
  _id: job._id,
  status: "processing",
  lockToken: job.lockToken,
  lockedBy: WORKER_ID,
});

// ==========================================
// RECOVER EXPIRED JOBS
// ==========================================

const recoverExpiredJobs = async () => {
  const now = new Date();

  const expired = {
    status: "processing",
    lockExpiresAt: { $lte: now },
  };

  await ContactNotification.updateMany(
    {
      ...expired,
      $expr: {
        $lt: ["$attempts", "$maxAttempts"],
      },
    },
    {
      $set: {
        status: "pending",
        nextRetryAt: now,
        lockToken: null,
        lockedBy: null,
        lockedAt: null,
        lockExpiresAt: null,
      },
    }
  );

  await ContactNotification.updateMany(
    {
      ...expired,
      $expr: {
        $gte: ["$attempts", "$maxAttempts"],
      },
    },
    {
      $set: {
        status: "failed",
        failedAt: now,
        nextRetryAt: null,
        lastErrorCode: "MAX_ATTEMPTS",
        lastError:
          "Maximum delivery attempts reached.",
        lockToken: null,
        lockedBy: null,
        lockedAt: null,
        lockExpiresAt: null,
      },
    }
  );
};

// ==========================================
// CLAIM ONE JOB ATOMICALLY
// ==========================================

const claimJob = async () => {
  const now = new Date();

  return ContactNotification.findOneAndUpdate(
    {
      status: "pending",
      nextRetryAt: { $lte: now },
      $expr: {
        $lt: ["$attempts", "$maxAttempts"],
      },
    },
    {
      $set: {
        status: "processing",
        lockToken: randomUUID(),
        lockedBy: WORKER_ID,
        lockedAt: now,
        lockExpiresAt: new Date(
          now.getTime() +
            CONTACT_NOTIFICATION_LEASE_MS
        ),
        lastAttemptAt: now,
      },
      $inc: {
        attempts: 1,
      },
    },
    {
      sort: {
        nextRetryAt: 1,
        createdAt: 1,
      },
      returnDocument: "after",
    }
  );
};

// ==========================================
// SYNC ADMIN REPLY STATUS
// ==========================================

const syncReplyStatus = async (
  job,
  status,
  fields = {}
) => {
  if (
    job.type !== "admin_reply" ||
    !job.replyId
  ) {
    return;
  }

  const updates = {
    "replies.$[reply].deliveryStatus": status,
  };

  for (const [key, value] of Object.entries(fields)) {
    updates[`replies.$[reply].${key}`] =
      value;
  }

  await Contact.updateOne(
    {
      _id: job.contact,
    },
    {
      $set: updates,
    },
    {
      arrayFilters: [
        { "reply._id": job.replyId },
      ],
    }
  );
};

// ==========================================
// RESEND SEND WITH TIMEOUT
// ==========================================

const sendEmail = async (job) => {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, SEND_TIMEOUT_MS);

  try {
    const { data, error } =
      await resend.emails.send(
        {
          from: env.email.from,
          to: [job.recipientEmail],
          subject: job.subject,
          text: job.textBody,
        },
        {
          idempotencyKey: job.idempotencyKey,
          signal: controller.signal,
        }
      );

    if (error) {
      throw error;
    }

    if (!data?.id) {
      throw new Error(
        "Resend did not return an email ID."
      );
    }

    return data.id;
  } finally {
    clearTimeout(timeout);
  }
};

// ==========================================
// MARK JOB AS ACCEPTED
// ==========================================

const markSent = async (
  job,
  providerMessageId
) => {
  const now = new Date();

  const result =
    await ContactNotification.updateOne(
      ownershipFilter(job),
      {
        $set: {
          status: "sent",
          providerMessageId,
          providerAcceptedAt: now,
          sentAt: now,
          failedAt: null,
          lastError: null,
          lastErrorCode: null,
          lockToken: null,
          lockedBy: null,
          lockedAt: null,
          lockExpiresAt: null,
        },
      }
    );

  if (result.modifiedCount !== 1) {
    logger.warn(
      "Contact job ownership lost after send",
      { jobId: String(job._id) }
    );
    return;
  }

  try {
    await syncReplyStatus(job, "sent", {
      providerMessageId,
      sentAt: now,
      failureReason: null,
    });
  } catch (error) {
    logger.error(
      "Contact reply status sync failed",
      {
        jobId: String(job._id),
        message: safeMessage(error),
      }
    );
  }

  logger.info("Contact email accepted", {
    jobId: String(job._id),
    providerMessageId,
  });
};

// ==========================================
// HANDLE DELIVERY FAILURE
// ==========================================

const markFailure = async (job, error) => {
  const now = new Date();

  const permanent = isPermanentError(error);

  const exhausted =
    job.attempts >= job.maxAttempts;

  const terminal = permanent || exhausted;

  const status = terminal
    ? "failed"
    : "pending";

  const result =
    await ContactNotification.updateOne(
      ownershipFilter(job),
      {
        $set: {
          status,
          nextRetryAt: terminal
            ? null
            : new Date(
                now.getTime() +
                  retryDelay(job.attempts)
              ),
          failedAt: terminal ? now : null,
          lastError: safeMessage(error),
          lastErrorCode: safeCode(error),
          lockToken: null,
          lockedBy: null,
          lockedAt: null,
          lockExpiresAt: null,
        },
      }
    );

  if (result.modifiedCount !== 1) {
    return;
  }

  try {
    await syncReplyStatus(
      job,
      terminal ? "failed" : "pending",
      {
        failureReason: terminal
          ? safeMessage(error)
          : null,
      }
    );
  } catch (syncError) {
    logger.error(
      "Contact reply failure sync failed",
      {
        jobId: String(job._id),
        message: safeMessage(syncError),
      }
    );
  }

  logger.warn("Contact email send failed", {
    jobId: String(job._id),
    attempt: job.attempts,
    permanent,
    exhausted,
    code: safeCode(error),
  });
};

// ==========================================
// PROCESS ONE JOB
// ==========================================

const processJob = async (job) => {
  let providerMessageId;

  try {
    providerMessageId = await sendEmail(job);
  } catch (error) {
    await markFailure(job, error);
    return;
  }

  await markSent(job, providerMessageId);
};

// ==========================================
// PROCESS ONE BATCH
// ==========================================

const runBatch = async () => {
  if (
    stopped ||
    mongoose.connection.readyState !== 1
  ) {
    return;
  }

  await recoverExpiredJobs();

  // Process sequentially to avoid sudden
  // provider request bursts.
  for (let index = 0; index < 10; index++) {
    if (stopped) break;

    const job = await claimJob();

    if (!job) break;

    await processJob(job);
  }
};

// ==========================================
// SCHEDULE WITHOUT OVERLAP
// ==========================================

const scheduleBatch = () => {
  if (stopped || runningPromise) {
    return;
  }

  runningPromise = runBatch()
    .catch((error) => {
      logger.error(
        "Contact worker batch failed",
        { message: safeMessage(error) }
      );
    })
    .finally(() => {
      runningPromise = null;
    });
};

// ==========================================
// START WORKER
// ==========================================

export const startContactEmailWorker = () => {
  if (!stopped) return;

  stopped = false;

  timer = setInterval(
    scheduleBatch,
    POLL_INTERVAL_MS
  );

  timer.unref?.();

  scheduleBatch();

  logger.info("Contact email worker started", {
    workerId: WORKER_ID,
  });
};

// ==========================================
// STOP WORKER
// ==========================================

export const stopContactEmailWorker =
  async () => {
    stopped = true;

    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    // Wait for the currently running batch.
    // The server's shutdown deadline still
    // provides the outer safety limit.
    if (runningPromise) {
      await runningPromise;
    }

    logger.info(
      "Contact email worker stopped",
      { workerId: WORKER_ID }
    );
  };
