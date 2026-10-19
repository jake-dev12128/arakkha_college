import "dotenv/config";

const getRequiredEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const nodeEnv = process.env.NODE_ENV || "development";

export const env = {
  nodeEnv,

  isDevelopment: nodeEnv === "development",

  isProduction: nodeEnv === "production",

  port: Number(process.env.PORT) || 5000,

  mongo: {
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
    minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 5,
    maxIdleTimeMS: Number(process.env.MONGO_MAX_IDLE_TIME_MS) || 60000,
    serverSelectionTimeoutMS:
      Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
    connectTimeoutMS:
      Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000,
    socketTimeoutMS:
      Number(process.env.MONGO_SOCKET_TIMEOUT_MS) || 45000,
  },

  redis: {
    connectTimeoutMS:
      Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 5000,
    maxReconnectDelayMS:
      Number(process.env.REDIS_MAX_RECONNECT_DELAY_MS) || 30000,
  },

  mongoUri: getRequiredEnv("MONGO_URI"),

  redisUrl: getRequiredEnv("REDIS_URL"),

  clientUrl: getRequiredEnv("CLIENT_URL"),

  clerkPublishableKey: getRequiredEnv("CLERK_PUBLISHABLE_KEY"),

  clerkSecretKey: getRequiredEnv("CLERK_SECRET_KEY"),

  clerkWebhookSigningSecret: getRequiredEnv("CLERK_WEBHOOK_SIGNING_SECRET"),

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",

  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",

  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  // email: {
  //   host:
  //     getRequiredEnv(
  //       "SMTP_HOST"
  //     ),

  //   port:
  //     Number(
  //       process.env.SMTP_PORT ||
  //       587
  //     ),

  //   secure:
  //     process.env.SMTP_SECURE ===
  //     "true",

  //   user:
  //     getRequiredEnv(
  //       "SMTP_USER"
  //     ),

  //   password:
  //     getRequiredEnv(
  //       "SMTP_PASSWORD"
  //     ),

  //   from:
  //     getRequiredEnv(
  //       "SMTP_FROM"
  //     ),
  // },
     email: {
    apiKey:
      getRequiredEnv("RESEND_API_KEY"),

    from:
      getRequiredEnv("EMAIL_FROM"),
  },


};
