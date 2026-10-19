import { createClient } from "redis";

import { env } from "./env.js";
import logger from "../utils/logger.js";

const redisClient = createClient({
  url: env.redisUrl,
  disableOfflineQueue: true,
  socket: {
    connectTimeout: env.redis.connectTimeoutMS,
    keepAlive: 5000,
    reconnectStrategy: (retries) => {
      const delay = Math.min(
        1000 * 2 ** Math.min(retries, 5),
        env.redis.maxReconnectDelayMS,
      );

      return delay;
    },
  },
});

redisClient.on("error", (error) => {
  logger.error("Redis client error", {
    name: error?.name,
    code: error?.code,
    message: error?.message,
  });
});

redisClient.on("connect", () => {
  logger.info("Redis connecting");
});

redisClient.on("ready", () => {
  logger.info("Redis connection ready");
});

redisClient.on("reconnecting", (delay) => {
  logger.warn("Redis reconnecting", { delay });
});

redisClient.on("end", () => {
  logger.warn("Redis connection closed");
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
};

export const pingRedis = async () => {
  if (!redisClient.isReady) {
    return false;
  }

  return (await redisClient.ping()) === "PONG";
};

export { redisClient };
