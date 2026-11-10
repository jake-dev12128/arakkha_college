
import mongoose from "mongoose";

import Program from "../models/program.model.js";
import Curriculum from "../models/curriculum.model.js";
import Course from "../models/course.model.js";

import {
  getAllowedProgramCourseIds,
} from "../services/programCourseAccess.service.js";

import {
  asyncHandler,
} from "../utils/asyncHandler.js";

// ==========================================
// HELPERS
// ==========================================

const publicProgramFields =
  "code name slug description type " +
  "durationYears semestersPerYear imageUrl";

const publicCourseFields =
  "code title description credits " +
  "lectureHours practicalHours";

const isValidId = (id) =>
  mongoose.isValidObjectId(id);

const sendInvalidId = (res) =>
  res.status(400).json({
    success: false,
    code: "INVALID_PROGRAM_ID",
    message: "Invalid program ID.",
  });

const sendNotFound = (res) =>
  res.status(404).json({
    success: false,
    code: "PROGRAM_NOT_FOUND",
    message: "Published program not found.",
  });

// ==========================================
// GET ALL PUBLIC PROGRAMS
// GET /api/v1/public/programs
// ==========================================

export const getPublicPrograms = asyncHandler(
  async (req, res) => {
    const programs = await Program.find({
      isPublished: true,
      isActive: true,
    })
      .select(publicProgramFields)
      .sort({
        name: 1,
        _id: 1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        programs,
        total: programs.length,
      },
    });
  }
);

// ==========================================
// GET SINGLE PUBLIC PROGRAM
// GET /api/v1/public/programs/:programId
// ==========================================

export const getPublicProgram = asyncHandler(
  async (req, res) => {
    const { programId } = req.params;

    if (!isValidId(programId)) {
      return sendInvalidId(res);
    }

    const program = await Program.findOne({
      _id: programId,
      isPublished: true,
      isActive: true,
    })
      .select(publicProgramFields)
      .lean();

    if (!program) {
      return sendNotFound(res);
    }

    return res.status(200).json({
      success: true,
      data: {
        program,
      },
    });
  }
);

// ==========================================
// GET AUTHORIZED PROGRAM COURSES
// GET /api/v1/public/programs/:programId/courses
//
// Authentication: Required
// Roles: super_admin / admin / teacher / student
// Student: Active enrollment and assignment required
// Teacher: All published curriculum courses
// Admin/Super Admin: All published curriculum courses
// Lessons and videos: Separate authorization required
// // ==========================================

export const getPublishedProgramCourses =
  asyncHandler(async (req, res) => {
    const { programId } = req.params;

    // ======================================
    // 1. VALIDATE PROGRAM ID
    // ======================================

    if (!isValidId(programId)) {
      return sendInvalidId(res);
    }

    // ======================================
    // 2. VERIFY PUBLISHED ACTIVE PROGRAM
    // ======================================

    const program = await Program.findOne({
      _id: programId,
      isPublished: true,
      isActive: true,
    })
      .select(publicProgramFields)
      .lean();

    if (!program) {
      return sendNotFound(res);
    }

    // ======================================
    // 3. VERIFY USER PROGRAM ACCESS
    // ======================================

    const allowedCourseIds =
      await getAllowedProgramCourseIds(
        req.user,
        program._id
      );

    // ======================================
    // 4. FIND EFFECTIVE PUBLISHED CURRICULUM
    // ======================================

    const curriculum = await Curriculum.findOne({
      program: program._id,
      status: "published",
      effectiveFrom: {
        $lte: new Date(),
      },
    })
      .sort({
        effectiveFrom: -1,
        createdAt: -1,
        _id: -1,
      })
      .select(
        "version effectiveFrom semesters"
      )
      .lean();

    if (!curriculum) {
      return res.status(200).json({
        success: true,
        data: {
          program,
          curriculum: null,
          semesters: [],
          totalCourses: 0,
        },
      });
    }

    // ======================================
    // 5. COLLECT CURRICULUM COURSE IDS
    // ======================================

    const courseIds = [
      ...new Set(
        (curriculum.semesters ?? [])
          .flatMap(
            (semester) =>
              semester.courses ?? []
          )
          .map((entry) =>
            String(entry.course)
          )
      ),
    ];

    // ======================================
    // 6. FILTER BY USER ASSIGNMENTS
    // ======================================

    // Admins receive all published curriculum
    // courses. Students and teachers receive
    // only courses in their allowed set.

    const visibleCourseIds =
      allowedCourseIds === null
        ? courseIds
        : courseIds.filter((courseId) =>
            allowedCourseIds.has(
              String(courseId)
            )
          );

    // ======================================
    // 7. LOAD ACTIVE AUTHORIZED COURSES
    // ======================================

    const courses = await Course.find({
      _id: {
        $in: visibleCourseIds,
      },
      isActive: true,
    })
      .select(publicCourseFields)
      .lean();

    const courseMap = new Map(
      courses.map((course) => [
        String(course._id),
        course,
      ])
    );

    // ======================================
    // 8. BUILD YEAR / SEMESTER STRUCTURE
    // ======================================

    const semesters = (
      curriculum.semesters ?? []
    )
      .map((semester) => ({
        yearNumber: semester.yearNumber,

        semesterNumber:
          semester.semesterNumber,

        courses: (semester.courses ?? [])
          .map((entry) => {
            const course = courseMap.get(
              String(entry.course)
            );

            if (!course) {
              return null;
            }

            return {
              ...course,
              courseType:
                entry.courseType,
              order:
                entry.order,
            };
          })
          .filter(Boolean)
          .sort(
            (a, b) =>
              a.order - b.order
          ),
      }))
      .sort(
        (a, b) =>
          a.yearNumber - b.yearNumber ||
          a.semesterNumber - b.semesterNumber
      );

    // ======================================
    // 9. RETURN AUTHORIZED COURSE CATALOG
    // ======================================

    return res.status(200).json({
      success: true,
      data: {
        program,

        curriculum: {
          _id: curriculum._id,
          version: curriculum.version,
          effectiveFrom:
            curriculum.effectiveFrom,
        },

        semesters,

        totalCourses:
          courses.length,
      },
    });
  });
