import mongoose from "mongoose";

import { env } from "./env.js";
import logger from "../utils/logger.js";

// Fail fast instead of buffering queries while MongoDB is unavailable.
mongoose.set("bufferCommands", false);

mongoose.connection.on("connected", () => {
  logger.info("MongoDB connection established");
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB connection lost");
});

mongoose.connection.on("error", (error) => {
  logger.error("MongoDB connection error", {
    name: error?.name,
    code: error?.code,
    message: error?.message,
  });
});

export const connectDB = async () => {
  await mongoose.connect(env.mongoUri, {
    maxPoolSize: env.mongo.maxPoolSize,
    minPoolSize: env.mongo.minPoolSize,
    maxIdleTimeMS: env.mongo.maxIdleTimeMS,
    serverSelectionTimeoutMS: env.mongo.serverSelectionTimeoutMS,
    connectTimeoutMS: env.mongo.connectTimeoutMS,
    socketTimeoutMS: env.mongo.socketTimeoutMS,
    retryWrites: true,
    w: "majority",
  });
};
