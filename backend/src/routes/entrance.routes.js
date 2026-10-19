
import { Router } from "express";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/authorization.middleware.js";

import {
  validate,
} from "../middleware/validation.middleware.js";

import * as s from "../schemas/entrance.schema.js";
import * as c from "../controllers/entrance.controller.js";

// ========================================
// PUBLIC ROUTER
// ========================================

export const publicEntranceRouter = Router();

publicEntranceRouter.get(
  "/entrance-information/:year",
  validate(s.yearParamsSchema, "params"),
  c.publicInformation
);

publicEntranceRouter.get(
  "/entrance-students/:year",
  validate(s.yearParamsSchema, "params"),
  validate(s.pageQuerySchema, "query"),
  c.publicApplicants
);

// ========================================
// ADMIN ROUTER
// ========================================

export const adminEntranceRouter = Router();

adminEntranceRouter.use(
  requireAuthentication,
  requireRole("super_admin", "admin")
);

adminEntranceRouter
  .route("/entrance-information")
  .get(
    validate(s.pageQuerySchema, "query"),
    c.listInformation
  )
  .post(
    validate(s.createInformationSchema),
    c.createInformation
  );

adminEntranceRouter
  .route("/entrance-information/:id")
  .get(
    validate(s.idParamsSchema, "params"),
    c.detailInformation
  )
  .patch(
    validate(s.idParamsSchema, "params"),
    validate(s.updateInformationSchema),
    c.updateInformation
  );

adminEntranceRouter.post(
  "/entrance-information/:id/publish",
  validate(s.idParamsSchema, "params"),
  c.publishInformation
);

adminEntranceRouter.post(
  "/entrance-information/:id/archive",
  validate(s.idParamsSchema, "params"),
  c.archiveInformation
);

// ========================================
// ENTRANCE LISTS
// ========================================

adminEntranceRouter
  .route("/entrance-lists")
  .get(
    validate(s.pageQuerySchema, "query"),
    c.listLists
  )
  .post(
    validate(s.createListSchema),
    c.createList
  );

adminEntranceRouter
  .route("/entrance-lists/:id")
  .get(
    validate(s.idParamsSchema, "params"),
    c.detailList
  )
  .patch(
    validate(s.idParamsSchema, "params"),
    validate(s.updateListSchema),
    c.updateList
  );

adminEntranceRouter.post(
  "/entrance-lists/:id/publish",
  validate(s.idParamsSchema, "params"),
  c.publishList
);

adminEntranceRouter.post(
  "/entrance-lists/:id/archive",
  validate(s.idParamsSchema, "params"),
  c.archiveList
);

// ========================================
// APPLICANTS
// ========================================

adminEntranceRouter
  .route("/entrance-lists/:id/applicants")
  .get(
    validate(s.idParamsSchema, "params"),
    validate(s.pageQuerySchema, "query"),
    c.listApplicants
  )
  .post(
    validate(s.idParamsSchema, "params"),
    validate(s.createApplicantSchema),
    c.createApplicant
  );

adminEntranceRouter
  .route("/entrance-lists/:id/applicants/:applicantId")
  .patch(
    validate(s.applicantParamsSchema, "params"),
    validate(s.updateApplicantSchema),
    c.updateApplicant
  )
  .delete(
    validate(s.applicantParamsSchema, "params"),
    c.deleteApplicant
  );
