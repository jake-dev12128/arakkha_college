
import sharp from "sharp";
import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";

// ==========================================
// IMAGE FOLDERS
// ==========================================

const IMAGE_FOLDERS = Object.freeze({
  news: "acc/news/images",
  programs: "acc/programs/images",
  faculties: "acc/faculties/images",
  collaborations: "acc/collaborations/logos",
  students: "acc/students/profiles",
  users: "acc/users/profiles",
  thumbnails: "acc/courses/thumbnails",

  // Organization Chart
  "organization-charts": "acc/organization-charts/images",
});

// ==========================================
// IMAGE PROCESSING CONFIGURATION
// ==========================================

const DEFAULT_IMAGE_OPTIONS = Object.freeze({
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 82,
  limitInputPixels: 25_000_000,
});

const ORGANIZATION_CHART_IMAGE_OPTIONS = Object.freeze({
  maxWidth: 5000,
  maxHeight: 5000,
  quality: 95,
  limitInputPixels: 25_000_000,
});

const getImageOptions = (category) => {
  if (category === "organization-charts") {
    return ORGANIZATION_CHART_IMAGE_OPTIONS;
  }

  return DEFAULT_IMAGE_OPTIONS;
};

// ==========================================
// UPLOAD IMAGE TO CLOUDINARY
// ==========================================

export const uploadImageToCloudinary = async (
  file,
  category
) => {
  const folder = IMAGE_FOLDERS[category];

  if (!folder) {
    const error = new Error("Invalid image category.");
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  const options = getImageOptions(category);

  let buffer;

  try {
    buffer = await sharp(file.buffer, {
      limitInputPixels: options.limitInputPixels,
      failOn: "error",
    })
      .rotate()
      .resize(options.maxWidth, options.maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: options.quality,
      })
      .toBuffer();
  } catch {
    const error = new Error("Invalid image content.");
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: "webp",
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: "image",
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
        });
      }
    );

    Readable.from([buffer]).pipe(stream);
  });
};
