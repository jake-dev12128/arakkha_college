import multer from "multer";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const imageUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
    parts: 1,
  },

  fileFilter(req, file, cb) {
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error("Invalid image format.");
      error.statusCode = 400;
      error.isOperational = true;
      error.code = "INVALID_IMAGE_TYPE";

      return cb(error);
    }

    cb(null, true);
  },
}).single("image");