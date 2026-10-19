
import express from "express";
import { z } from "zod";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/authorization.middleware.js";

import {
  validate,
} from "../middleware/validation.middleware.js";

import {
  assignTeacher,
  assignStudent,
  getAllAssignments,
  removeStudent,
  revokeAssignment,
  getTeacherCourses,
  getTeacherCourseStudents,
  getStudentCourses,
} from "../controllers/courseAccess.controller.js";

// ==================================================
// ROUTER
// ==================================================

const router = express.Router();

// ==================================================
// VALIDATION HELPERS
// ==================================================

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid MongoDB ObjectId.",
  );

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  courseId: objectIdSchema.optional(),

  teacherId: objectIdSchema.optional(),

  isActive: z.enum([
    "true",
    "false",
  ]).optional(),
}).strict();

// ==================================================
// REQUEST BODY SCHEMAS
// ==================================================

// ADMIN: ASSIGN TEACHER TO COURSE

const assignTeacherSchema = z.object({
  courseId: objectIdSchema,
  teacherId: objectIdSchema,
  cohortId: objectIdSchema,
}).strict();

// ADMIN: ASSIGN STUDENT TO COURSE ASSIGNMENT

const assignStudentSchema = z.object({
  assignmentId: objectIdSchema,
  studentId: objectIdSchema,
}).strict();

// ==================================================
// ROUTE PARAMETER SCHEMAS
// ==================================================

const assignmentParamsSchema = z.object({
  assignmentId: objectIdSchema,
}).strict();

const removeStudentParamsSchema = z.object({
  assignmentId: objectIdSchema,
  studentId: objectIdSchema,
}).strict();

// ==================================================
// AUTHENTICATION
// ==================================================

// All routes below require a valid Clerk session,
// an active MongoDB user and valid application session.


// ==================================================
// ADMIN / SUPER ADMIN
// ==================================================

// GET ALL COURSE ASSIGNMENTS
//
// GET /api/v1/admin/course-assignments
//
// Supports:
// ?page=1
// &limit=20
// &courseId=...
// &teacherId=...
// &isActive=true

router.get(
  "/admin/course-assignments",requireAuthentication,
  requireRole("super_admin", "admin"),
  validate(paginationSchema, "query"),
  getAllAssignments,
);

// ASSIGN TEACHER TO COURSE
//
// POST /api/v1/admin/course-assignments/teachers

router.post(
  "/admin/course-assignments/teachers",requireAuthentication,
  requireRole("super_admin", "admin"),
  validate(assignTeacherSchema, "body"),
  assignTeacher,
);

// ASSIGN STUDENT TO COURSE ASSIGNMENT
//
// POST /api/v1/admin/course-assignments/students

router.post(
  "/admin/course-assignments/students",requireAuthentication,
  requireRole("super_admin", "admin"),
  validate(assignStudentSchema, "body"),
  assignStudent,
);

// REMOVE STUDENT FROM COURSE ASSIGNMENT
//
// DELETE
// /api/v1/admin/course-assignments/:assignmentId/students/:studentId

router.delete(
  "/admin/course-assignments/:assignmentId/students/:studentId",requireAuthentication,
  requireRole("super_admin", "admin"),
  validate(removeStudentParamsSchema, "params"),
  removeStudent,
);

// REVOKE TEACHER COURSE ASSIGNMENT
//
// PATCH
// /api/v1/admin/course-assignments/:assignmentId/revoke

router.patch(
  "/admin/course-assignments/:assignmentId/revoke",requireAuthentication,
  requireRole("super_admin", "admin"),
  validate(assignmentParamsSchema, "params"),
  revokeAssignment,
);

// ==================================================
// TEACHER
// ==================================================

// GET CURRENT TEACHER'S ASSIGNED COURSES
//
// GET /api/v1/teacher/courses

router.get(
  "/teacher/courses",requireAuthentication,
  requireRole("teacher"),
  getTeacherCourses,
);

// GET STUDENTS OF TEACHER'S OWN ASSIGNMENT
//
// GET
// /api/v1/teacher/course-assignments/:assignmentId/students

router.get(
  "/teacher/course-assignments/:assignmentId/students",requireAuthentication,
  requireRole("teacher"),
  validate(assignmentParamsSchema, "params"),
  getTeacherCourseStudents,
);

// ==================================================
// STUDENT
// ==================================================

// GET CURRENT STUDENT'S ASSIGNED COURSES
//
// GET /api/v1/student/courses

router.get(
  "/student/courses",requireAuthentication,
  requireRole("student"),
  getStudentCourses,
);

// ==================================================
// EXPORT
// ==================================================

export default router;
