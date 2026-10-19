import express from "express";
import cors from "cors";
import helmet from "helmet";

import { clerkMiddleware } from "@clerk/express";

import { env } from "./config/env.js";
import { getDependencyHealth } from "./config/health.js";
import { isShuttingDown } from "./utils/runtime.js";

// ==================================================
// MIDDLEWARE
// ==================================================

import { generalRateLimiter } from "./middleware/rateLimit.middleware.js";

import { notFoundMiddleware } from "./middleware/notFound.middleware.js";

import { errorMiddleware } from "./middleware/error.middleware.js";

import { requestIdMiddleware } from "./middleware/requestId.middleware.js";

import { requestLoggerMiddleware } from "./middleware/requestLogger.middleware.js";

// ==================================================
// ROUTES
// ==================================================

import webhookRoutes from "./routes/webhook.routes.js";

import authRoutes from "./routes/auth.routes.js";

import adminRoutes from "./routes/admin.routes.js";

import userSessionRoutes from "./routes/userSession.routes.js";

import courseAccessRoutes from "./routes/courseAccess.routes.js";

import academicAdminRoutes from "./routes/academicAdmin.routes.js";

import academicSafeDeleteRoutes from "./routes/academicSafeDelete.routes.js";

import publicAcademicRoutes from "./routes/publicAcademic.routes.js";

import {
  publicEntranceRouter,
  adminEntranceRouter,
} from "./routes/entrance.routes.js";

import { publicAboutRouter, adminAboutRouter } from "./routes/about.routes.js";

// ==================================================
// FACULTIES & STAFF CMS ROUTES
// ==================================================

import {
  publicFacultyRoutes,
  adminFacultyRoutes,
} from "./routes/facultyMember.routes.js";
import {
  publicCollaborationRoutes,
  adminCollaborationRoutes,
} from "./routes/collaborationPartner.routes.js";
import { publicNewsRoutes, adminNewsRoutes } from "./routes/news.routes.js";
// ==================================================
// EXPRESS APP
// ==================================================

const app = express();

app.disable("x-powered-by");

// ==================================================
// REQUEST ID + LOGGER
// ==================================================

app.use(requestIdMiddleware);

app.use(requestLoggerMiddleware);

// ==================================================
// TRUST PROXY
// ==================================================

if (env.isProduction) {
  app.set("trust proxy", 1);
}

// ==================================================
// CLERK MIDDLEWARE
// ==================================================

app.use(
  clerkMiddleware({
    authorizedParties: [env.clientUrl],
  }),
);

// ==================================================
// SECURITY
// ==================================================

app.use(helmet());

// ==================================================
// CORS
// ==================================================

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);

// ==================================================
// WEBHOOKS
// ==================================================

app.use("/api/webhooks", webhookRoutes);

// ==================================================
// BODY PARSER
// ==================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// ==================================================
// GENERAL API RATE LIMITER
// ==================================================

app.use("/api/v1", generalRateLimiter);

// ==================================================
// PUBLIC API ROUTES
// NO AUTHENTICATION REQUIRED
// ==================================================

// About Us
app.use("/api/v1/public", publicAboutRouter);

// Academic
app.use("/api/v1/public", publicAcademicRoutes);

// Entrance
app.use("/api/v1/public", publicEntranceRouter);

// Faculties & Staff
app.use("/api/v1/public/faculty-members", publicFacultyRoutes);
//collaboration
app.use("/api/v1/public/collaborations", publicCollaborationRoutes);
app.use("/api/v1/public/news", publicNewsRoutes);
// ==================================================
// ADMIN API ROUTES
// AUTHENTICATION + RBAC
// ==================================================

// About Us Management
app.use("/api/v1/admin", adminAboutRouter);

// Academic Management
app.use("/api/v1/admin", academicAdminRoutes);

// Academic Safe Delete
app.use("/api/v1/admin/academic-delete", academicSafeDeleteRoutes);

// General Admin
app.use("/api/v1/admin", adminRoutes);

// Entrance Management
app.use("/api/v1/admin", adminEntranceRouter);

// Faculties & Staff Management
app.use("/api/v1/admin/faculty-members", adminFacultyRoutes);
app.use("/api/v1/admin/collaborations", adminCollaborationRoutes);
app.use("/api/v1/admin/news", adminNewsRoutes);
// ==================================================
// COURSE ACCESS
// ==================================================

app.use("/api/v1", courseAccessRoutes);

// ==================================================
// AUTHENTICATION ROUTES
// ==================================================

app.use("/api/v1/auth", authRoutes);

// ==================================================
// USER SESSION ROUTES
// ==================================================

app.use("/api/v1/sessions", userSessionRoutes);

// ==================================================
// HEALTH CHECK
// ==================================================

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    status: "ok",
    environment: env.nodeEnv,
    requestId: req.requestId,
  });
});

// ==================================================
// LIVENESS CHECK
// ==================================================

app.get("/health/live", (req, res) => {
  return res.status(200).json({
    success: true,
    status: "alive",
    requestId: req.requestId,
  });
});

// ==================================================
// READINESS CHECK
// ==================================================

app.get("/health/ready", (req, res) => {
  const health = getDependencyHealth();

  if (isShuttingDown() || !health.ready) {
    return res.status(503).json({
      success: false,
      status: "not_ready",
      dependencies: health,
      requestId: req.requestId,
    });
  }

  return res.status(200).json({
    success: true,
    status: "ready",
    requestId: req.requestId,
  });
});

// ==================================================
// 404 HANDLER
// ==================================================

app.use(notFoundMiddleware);

// ==================================================
// GLOBAL ERROR HANDLER
// ==================================================

app.use(errorMiddleware);

export default app;
