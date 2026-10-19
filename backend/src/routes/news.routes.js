
import { Router } from "express";

import {
  publicNewsList,
  publicNewsDetail,
  adminNewsList,
  adminNewsDetail,
  adminCreateNews,
  adminUpdateNews,
  adminPublishNews,
  adminDeleteNews,
} from "../controllers/news.controller.js";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

const publicRouter = Router();
const adminRouter = Router();

const requireNewsAdmin = (req, res, next) => {
  if (
    !req.user ||
    !["admin", "super_admin"].includes(req.user.role)
  ) {
    return res.status(403).json({
      success: false,
      message: "Insufficient permissions.",
      code: "FORBIDDEN",
    });
  }

  next();
};

// PUBLIC
publicRouter.get("/", publicNewsList);
publicRouter.get("/:id", publicNewsDetail);

// ADMIN
adminRouter.use(
  requireAuthentication,
  requireNewsAdmin
);

adminRouter.get("/", adminNewsList);
adminRouter.get("/:id", adminNewsDetail);
adminRouter.post("/", adminCreateNews);
adminRouter.patch("/:id", adminUpdateNews);

adminRouter.patch(
  "/:id/publication",
  adminPublishNews
);

adminRouter.delete("/:id", adminDeleteNews);

export {
  publicRouter as publicNewsRoutes,
  adminRouter as adminNewsRoutes,
};
