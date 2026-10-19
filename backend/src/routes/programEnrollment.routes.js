
import express from "express";

import {
  validate,
} from "../middleware/validation.middleware.js";

import {
  createProgramEnrollmentSchema,
  updateProgramEnrollmentSchema,
  programEnrollmentIdSchema,
  listProgramEnrollmentsSchema,
} from "../schemas/programEnrollment.schema.js";

import * as controller from "../controllers/programEnrollment.controller.js";

const router = express.Router();

const id = validate(
  programEnrollmentIdSchema,
  "params",
);

const list = validate(
  listProgramEnrollmentsSchema,
  "query",
);

router.route("/program-enrollments")
  .get(
    list,
    controller.listProgramEnrollments,
  )
  .post(
    validate(createProgramEnrollmentSchema),
    controller.createProgramEnrollment,
  );

router.route("/program-enrollments/:id")
  .get(
    id,
    controller.getProgramEnrollment,
  )
  .patch(
    id,
    validate(updateProgramEnrollmentSchema),
    controller.updateProgramEnrollment,
  );

export default router;
