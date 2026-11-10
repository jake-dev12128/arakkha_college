
import { Router } from "express";
import {
  requireCmsPermission,
} from "../middleware/teacherReadOnly.middleware.js";
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



// PUBLIC
publicRouter.get("/", publicNewsList);
publicRouter.get("/:id", publicNewsDetail);

// ADMIN
adminRouter.use(
  requireAuthentication,
  requireCmsPermission
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
