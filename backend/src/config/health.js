import mongoose from "mongoose";

import { redisClient } from "./redis.js";
import { isReady } from "../utils/runtime.js";

export const getDependencyHealth = () => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisReady = redisClient.isReady;

  return {
    application: isReady(),
    mongodb: mongoReady,
    redis: redisReady,
    ready: isReady() && mongoReady && redisReady,
  };
};
