import sharp from "sharp";
import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";

const IMAGE_FOLDERS = Object.freeze({
  news: "acc/news/images",
  programs: "acc/programs/images",
  faculties: "acc/faculties/images",
  collaborations: "acc/collaborations/logos",
  students: "acc/students/profiles",
  users: "acc/users/profiles",
  thumbnails: "acc/courses/thumbnails",
});

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

  let buffer;

  try {
    buffer = await sharp(file.buffer, {
      limitInputPixels: 25_000_000,
      failOn: "error",
    })
      .rotate()
      .resize(2000, 2000, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
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