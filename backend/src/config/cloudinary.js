import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

const required = {
  CLOUDINARY_CLOUD_NAME: env.cloudinaryCloudName,
  CLOUDINARY_API_KEY: env.cloudinaryApiKey,
  CLOUDINARY_API_SECRET: env.cloudinaryApiSecret,
};

for (const [name, value] of Object.entries(required)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
  secure: true,
});

export default cloudinary;