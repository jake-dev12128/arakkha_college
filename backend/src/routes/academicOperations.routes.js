
import express from "express";

import {
  validate,
} from "../middleware/validation.middleware.js";

import {
  createAcademicYearSchema,
  updateAcademicYearSchema,
  createCohortSchema,
  updateCohortSchema,
  operationsIdSchema,
  operationsListSchema,
} from "../schemas/academicOperations.schema.js";

import * as controller from "../controllers/academicOperations.controller.js";

const router = express.Router();



const id = validate(operationsIdSchema, "params");
const list = validate(operationsListSchema, "query");

// ACADEMIC YEARS

router.route("/academic-years")
  .get(list, controller.listAcademicYears)
  .post(
    validate(createAcademicYearSchema),
    controller.createAcademicYear,
  );

router.route("/academic-years/:id")
  .get(id, controller.getAcademicYear)
  .patch(
    id,
    validate(updateAcademicYearSchema),
    controller.updateAcademicYear,
  );
// ==================================================
// ACTIVATE ACADEMIC YEAR
// ==================================================

router.post(
  "/academic-years/:id/activate",
  id,
  controller.activateAcademicYear,
);

// ==================================================
// COMPLETE ACADEMIC YEAR
// ==================================================

router.post(
  "/academic-years/:id/complete",
  id,
  controller.completeAcademicYear,
);
// COHORTS

router.route("/cohorts")
  .get(list, controller.listCohorts)
  .post(
    validate(createCohortSchema),
    controller.createCohort,
  );

router.route("/cohorts/:id")
  .get(id, controller.getCohort)
  .patch(
    id,
    validate(updateCohortSchema),
    controller.updateCohort,
  );

export default router;
