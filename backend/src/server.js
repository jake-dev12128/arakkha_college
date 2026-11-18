
import app from "./app.js";
import mongoose from "mongoose";

import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import {
  connectRedis,
  redisClient,
} from "./config/redis.js";

// import { verifyEmailConnection } from "./services/email.service.js";

import {
  setReady,
  setShuttingDown,
} from "./utils/runtime.js";

import logger from "./utils/logger.js";

// ==========================================
// MEDIA CLEANUP WORKER — EXISTING
// ==========================================

import {
  startMediaCleanupWorker,
  stopMediaCleanupWorker,
} from "./workers/mediaCleanup.worker.js";

// ==========================================
// CONTACT EMAIL WORKER — NEW
// ==========================================

import {
  startContactEmailWorker,
  stopContactEmailWorker,
} from "./workers/contactEmail.worker.js";

// ==========================================
// SHUTDOWN CONFIGURATION
// ==========================================

const SHUTDOWN_TIMEOUT_MS = 15_000;

// ==========================================
// START SERVER
// ==========================================

const startServer = async () => {
  try {
    // ======================================
    // CONNECT DEPENDENCIES
    // ======================================

    await connectDB();
    await connectRedis();

    // await verifyEmailConnection();

    // ======================================
    // START BACKGROUND WORKERS
    // ======================================

    startMediaCleanupWorker();

    startContactEmailWorker();

    // ======================================
    // START HTTP SERVER
    // ======================================

    const server = app.listen(
      env.port,
      () => {
        setReady(true);

        logger.info("HTTP server started", {
          port: env.port,
          environment: env.nodeEnv,
        });
      }
    );

    let shuttingDown = false;

    // ======================================
    // GRACEFUL SHUTDOWN
    // ======================================

    const shutdown = async (signal) => {
      if (shuttingDown) {
        logger.warn(
          "Shutdown already in progress",
          { signal }
        );

        return;
      }

      shuttingDown = true;
      setShuttingDown(true);

      logger.info(
        "Graceful shutdown started",
        { signal }
      );

      const forceExitTimer = setTimeout(
        () => {
          logger.error(
            "Graceful shutdown timed out",
            {
              timeoutMs:
                SHUTDOWN_TIMEOUT_MS,
            }
          );

          process.exit(1);
        },
        SHUTDOWN_TIMEOUT_MS
      );

      forceExitTimer.unref();

      try {
        // ==================================
        // STOP ACCEPTING HTTP REQUESTS
        // ==================================

        await new Promise(
          (resolve, reject) => {
            server.close((error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            });
          }
        );

        // ==================================
        // STOP CONTACT EMAIL WORKER
        // ==================================

        await stopContactEmailWorker();

        // ==================================
        // STOP MEDIA CLEANUP WORKER
        // ==================================

        await stopMediaCleanupWorker();

        // ==================================
        // CLOSE REDIS
        // ==================================

        if (redisClient.isOpen) {
          await redisClient.quit();
        }

        // ==================================
        // CLOSE MONGODB
        // ==================================

        if (
          mongoose.connection.readyState !== 0
        ) {
          await mongoose.connection.close(
            false
          );
        }

        clearTimeout(forceExitTimer);

        logger.info(
          "Graceful shutdown completed"
        );

        process.exit(0);
      } catch (error) {
        clearTimeout(forceExitTimer);

        logger.error(
          "Graceful shutdown failed",
          { error }
        );

        process.exit(1);
      }
    };

    // ======================================
    // PROCESS SIGNALS
    // ======================================

    process.once(
      "SIGTERM",
      () => shutdown("SIGTERM")
    );

    process.once(
      "SIGINT",
      () => shutdown("SIGINT")
    );

    // ======================================
    // UNCAUGHT EXCEPTIONS
    // ======================================

    process.once(
      "uncaughtException",
      (error) => {
        logger.error(
          "Uncaught exception",
          { error }
        );

        void shutdown(
          "uncaughtException"
        );
      }
    );

    // ======================================
    // UNHANDLED REJECTIONS
    // ======================================

    process.on(
      "unhandledRejection",
      (reason) => {
        const error =
          reason instanceof Error
            ? reason
            : new Error(
                String(reason)
              );

        logger.error(
          "Unhandled promise rejection",
          { error }
        );

        void shutdown(
          "unhandledRejection"
        );
      }
    );
  } catch (error) {
    setShuttingDown(true);

    logger.error(
      "Server startup failed",
      { error }
    );

    process.exit(1);
  }
};

startServer();
