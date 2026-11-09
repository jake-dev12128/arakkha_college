
import { Router } from "express";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/authorization.middleware.js";

import {
  imageUpload,
} from "../middleware/imageUpload.middleware.js";

import {
  uploadImageController,
} from "../controllers/imageUpload.controller.js";

const router = Router();

// ==========================================
// ADMIN IMAGE CATEGORIES
// ==========================================

const ADMIN_IMAGE_CATEGORIES = new Set([
  "news",
  "programs",
  "faculties",
  "collaborations",
  "thumbnails",
]);

// ==========================================
// VALIDATE IMAGE CATEGORY
// ==========================================

const validateImageCategory = (req, res, next) => {
  const category = req.params.category;

  // All authenticated roles can upload
  // profile images to the users category.
 if (category === "users") {
  return requireRole(
    "super_admin",
    "admin"
  )(req, res, next);
}

  if (!ADMIN_IMAGE_CATEGORIES.has(category)) {
    return res.status(400).json({
      success: false,
      message: "Invalid image category.",
      code: "INVALID_IMAGE_CATEGORY",
      requestId: req.requestId,
    });
  }

  // Other categories remain admin-only.
  return requireRole(
    "admin",
    "super_admin"
  )(req, res, next);
};

// ==========================================
// IMAGE UPLOAD
// ==========================================

router.post(
  "/:category",
  requireAuthentication,
  validateImageCategory,
  imageUpload,
  uploadImageController
);

export default router;
