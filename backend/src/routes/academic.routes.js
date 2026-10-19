
import express from "express";


import {
  validate,
} from "../middleware/validation.middleware.js";

import {
  createProgramSchema,
  updateProgramSchema,
  createCourseSchema,
  updateCourseSchema,
  createCurriculumSchema,  cloneCurriculumSchema,

  updateCurriculumSchema,
  academicIdSchema,
  academicListSchema,
} from "../schemas/academic.schema.js";

import * as controller from "../controllers/academic.controller.js";

const router = express.Router();


const id = validate(academicIdSchema, "params");
const list = validate(academicListSchema, "query");

// ===========================
// PROGRAMS
// ===========================

router.route("/programs")
  .get(list, controller.listRecords("programs"))
  .post(
    validate(createProgramSchema),
    controller.createProgram
  );

router.route("/programs/:id")
  .get(id, controller.getRecord("programs"))
  .patch(
    id,
    validate(updateProgramSchema),
    controller.updateProgram
  );

router.patch(
  "/programs/:id/archive",
  id,
  controller.archiveProgram
);
// ==================================================
// PUBLISH PROGRAM
// ==================================================

router.post(
  "/programs/:id/publish",
  id,
  controller.publishProgram
);

// ==================================================
// UNPUBLISH PROGRAM
// ==================================================

router.post(
  "/programs/:id/unpublish",
  id,
  controller.unpublishProgram
);
// ===========================
// COURSES
// ===========================

router.route("/courses")
  .get(list, controller.listRecords("courses"))
  .post(
    validate(createCourseSchema),
    controller.createCourse
  );

router.route("/courses/:id")
  .get(id, controller.getRecord("courses"))
  .patch(
    id,
    validate(updateCourseSchema),
    controller.updateCourse
  );

router.patch(
  "/courses/:id/archive",
  id,
  controller.archiveCourse
);

// ===========================
// CURRICULA
// ===========================
// ==================================================
// CLONE CURRICULUM AS DRAFT
// ==================================================

router.post(
  "/curricula/:id/clone",
  id,
  validate(cloneCurriculumSchema),
  controller.cloneCurriculumAsDraft
);
router.route("/curricula")
  .get(list, controller.listRecords("curricula"))
  .post(
    validate(createCurriculumSchema),
    controller.createCurriculum
  );

router.route("/curricula/:id")
  .get(id, controller.getRecord("curricula"))
  .patch(
    id,
    validate(updateCurriculumSchema),
    controller.updateCurriculum
  );

router.post(
  "/curricula/:id/publish",
  id,
  controller.publishCurriculum
);

router.post(
  "/curricula/:id/archive",
  id,
  controller.archiveCurriculum
);

export default router;
