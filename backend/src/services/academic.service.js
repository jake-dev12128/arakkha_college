import mongoose from "mongoose";
import Program from "../models/program.model.js";
import Course from "../models/course.model.js";
import Curriculum from "../models/curriculum.model.js";
import AppError from "../utils/AppError.js";
import Cohort from "../models/cohort.model.js";
import {
  attachProgramImage,
  detachProgramImage,
  verifyCurrentProgramImage,
} from "./programMedia.service.js";
import {
  attachCourseImage,
  detachCourseImage,
  verifyCurrentCourseImage,
} from "./courseMedia.service.js";
const fail = (message, status = 400, code = "BAD_REQUEST") => {
  throw new AppError(message, status, code);
};

const getModel = (type) => {
  const models = {
    programs: Program,
    courses: Course,
    curricula: Curriculum,
  };
  return models[type];
};

const getRecord = async (Model, id) => {
  if (!mongoose.isValidObjectId(id)) {
    fail("Invalid resource ID.", 400, "INVALID_ID");
  }

  const record = await Model.findById(id);
  if (!record) {
    fail("Resource not found.", 404, "NOT_FOUND");
  }
  return record;
};

export const listAcademicRecords = async (
  type,
  { page = 1, limit = 20, search, status },
) => {
  const Model = getModel(type);

  if (!Model) {
    fail("Unsupported academic resource.", 400, "INVALID_RESOURCE_TYPE");
  }

  const filter = {};

  // ==========================================
  // STATUS FILTER
  // ==========================================

  const allowedStatuses = {
    curricula: ["draft", "published", "archived"],
  };

  if (status && status !== "all") {
    if (type === "courses" || type === "programs") {
      if (!["active", "inactive"].includes(status)) {
        fail("Invalid status filter.", 400, "INVALID_STATUS_FILTER");
      }

      filter.isActive = status === "active";
    } else {
      const allowed = allowedStatuses[type];

      if (!allowed || !allowed.includes(status)) {
        fail("Invalid status filter.", 400, "INVALID_STATUS_FILTER");
      }

      filter.status = status;
    }
  }

  // ==========================================
  // SEARCH FILTER
  // ==========================================

  if (typeof search === "string" && search.trim()) {
    const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const searchFields = {
      programs: ["name", "code", "slug"],
      courses: ["title", "code"],
      curricula: ["version"],
    };

    const fields = searchFields[type] || [];

    if (fields.length > 0) {
      filter.$or = fields.map((field) => ({
        [field]: {
          $regex: safeSearch,
          $options: "i",
        },
      }));
    }
  }

  // ==========================================
  // PAGINATION
  // ==========================================

  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);

  const safeLimit = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 20),
  );

  const skip = (safePage - 1) * safeLimit;

  // ==========================================
  // DATABASE QUERY
  // ==========================================

  const [data, total] = await Promise.all([
    Model.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    Model.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const getAcademicRecord = async (type, id) => {
  return getRecord(getModel(type), id);
};
const generateProgramSlug = (name) => {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    fail(
      "Program name cannot generate a valid slug.",
      400,
      "INVALID_PROGRAM_SLUG",
    );
  }

  return slug;
};
export const createProgram = async (data, actorId) => {
  const baseSlug = generateProgramSlug(data.name);
  const slug = `${baseSlug}-${data.code.toLowerCase()}`;

  const existing = await Program.exists({ slug });

  if (existing) {
    fail(
      "A program with this slug already exists.",
      409,
      "PROGRAM_SLUG_CONFLICT",
    );
  }

  const payload = { ...data };
  const mediaId = payload.imageMediaId;

  delete payload.imageMediaId;

  let created;

  await mongoose.connection.transaction(async (session) => {
    const program = new Program({
      ...payload,
      slug,
    });

    if (mediaId) {
      const url = await attachProgramImage(
        mediaId,
        program._id,
        actorId,
        session,
      );

      if (payload.imageUrl && payload.imageUrl !== url) {
        fail(
          "Program image URL and media ID do not match.",
          409,
          "PROGRAM_MEDIA_URL_MISMATCH",
        );
      }

      program.imageUrl = url;
      program.imageMediaId = mediaId;
    }

    await program.save({ session });
    created = program;
  });

  return created;
};

export const updateProgram = async (id, data, actorId) => {
  if (!mongoose.isValidObjectId(id)) {
    fail("Invalid resource ID.", 400, "INVALID_ID");
  }

  const payload = { ...data };

  const hasMediaId = Object.prototype.hasOwnProperty.call(
    payload,
    "imageMediaId",
  );

  const requestedMediaId = payload.imageMediaId;
  delete payload.imageMediaId;

  let updated;

  await mongoose.connection.transaction(async (session) => {
    const program = await Program.findById(id).session(session);

    if (!program) {
      fail("Resource not found.", 404, "NOT_FOUND");
    }

    if (program.isActive === false) {
      fail("Archived program cannot be edited.", 409);
    }

    const hasCurricula = await Curriculum.exists({
      program: id,
      status: { $ne: "archived" },
    }).session(session);

    if (
      hasCurricula &&
      (payload.durationYears !== undefined ||
        payload.semestersPerYear !== undefined)
    ) {
      fail("Cannot change program duration with existing curricula.", 409);
    }

    const previousMediaId = program.imageMediaId;

    if (hasMediaId) {
      if (
        requestedMediaId &&
        String(requestedMediaId) === String(previousMediaId || "")
      ) {
        await verifyCurrentProgramImage(
          requestedMediaId,
          program._id,
          program.imageUrl,
          session,
        );

        if (
          payload.imageUrl !== undefined &&
          payload.imageUrl !== program.imageUrl
        ) {
          fail(
            "Program image URL and media ID do not match.",
            409,
            "PROGRAM_MEDIA_URL_MISMATCH",
          );
        }
      } else {
        let nextUrl = "";

        if (requestedMediaId) {
          nextUrl = await attachProgramImage(
            requestedMediaId,
            program._id,
            actorId,
            session,
          );

          if (payload.imageUrl && payload.imageUrl !== nextUrl) {
            fail(
              "Program image URL and media ID do not match.",
              409,
              "PROGRAM_MEDIA_URL_MISMATCH",
            );
          }
        }

        if (previousMediaId) {
          await detachProgramImage(previousMediaId, program._id, session);
        }

        program.imageUrl = nextUrl;
        program.imageMediaId = requestedMediaId || null;
      }

      delete payload.imageUrl;
    } else if (payload.imageUrl !== undefined && previousMediaId) {
      if (payload.imageUrl !== program.imageUrl) {
        fail(
          "Use imageMediaId to replace or remove a managed image.",
          409,
          "PROGRAM_MEDIA_ID_REQUIRED",
        );
      }

      delete payload.imageUrl;
    }

    Object.assign(program, payload);

    await program.save({ session });
    updated = program;
  });

  return updated;
};

export const archiveProgram = async (id) => {
  let archived;

  await mongoose.connection.transaction(async (session) => {
    if (!mongoose.isValidObjectId(id)) {
      fail("Invalid resource ID.", 400, "INVALID_ID");
    }

    const program = await Program.findById(id).session(session);

    if (!program) {
      fail("Resource not found.", 404, "NOT_FOUND");
    }

    const activeCurriculum = await Curriculum.exists({
      program: id,
      status: { $ne: "archived" },
    }).session(session);

    if (activeCurriculum) {
      fail("Archive active curricula first.", 409);
    }

    program.isActive = false;
    program.isPublished = false;

    await program.save({ session });
    archived = program;
  });

  return archived;
};

export const createCourse = async (data, actorId) => {
  await validatePrerequisites(
    data.prerequisites ?? []
  );

  const payload = { ...data };
  const mediaId = payload.coverImageMediaId;

  delete payload.coverImageMediaId;

  let created;

  await mongoose.connection.transaction(
    async (session) => {
      const course = new Course(payload);

      if (mediaId) {
        const url = await attachCourseImage(
          mediaId,
          course._id,
          actorId,
          session
        );

        if (
          payload.coverImage &&
          payload.coverImage !== url
        ) {
          fail(
            "Course cover image URL and media ID do not match.",
            409,
            "COURSE_MEDIA_URL_MISMATCH"
          );
        }

        course.coverImage = url;
        course.coverImageMediaId = mediaId;
      } else if (payload.coverImage) {
        fail(
          "A managed course cover image requires coverImageMediaId.",
          400,
          "COURSE_MEDIA_ID_REQUIRED"
        );
      }

      await course.save({ session });

      created = course;
    }
  );

  return created;
};


const validatePrerequisites = async (ids, currentId = null) => {
  const unique = [...new Set(ids.map(String))];

  if (unique.length !== ids.length) {
    fail("Duplicate prerequisites are not allowed.");
  }

  if (currentId && unique.includes(String(currentId))) {
    fail("A course cannot be its own prerequisite.");
  }

  if (!unique.length) return;

  const count = await Course.countDocuments({
    _id: { $in: unique },
    isActive: true,
  });

  if (count !== unique.length) {
    fail("One or more prerequisites are invalid.");
  }
};

export const updateCourse = async (
  id,
  data,
  actorId
) => {
  if (!mongoose.isValidObjectId(id)) {
    fail(
      "Invalid resource ID.",
      400,
      "INVALID_ID"
    );
  }

  const payload = { ...data };

  const hasMediaId =
    Object.prototype.hasOwnProperty.call(
      payload,
      "coverImageMediaId"
    );

  const requestedMediaId =
    payload.coverImageMediaId;

  delete payload.coverImageMediaId;

  // Preserve the existing prerequisite validation.
  if (payload.prerequisites) {
    await validatePrerequisites(
      payload.prerequisites,
      id
    );
  }

  let updated;

  await mongoose.connection.transaction(
    async (session) => {
      const course = await Course.findById(
        id
      ).session(session);

      if (!course) {
        fail(
          "Resource not found.",
          404,
          "NOT_FOUND"
        );
      }

      if (!course.isActive) {
        fail(
          "Archived course cannot be edited.",
          409
        );
      }

      const previousMediaId =
        course.coverImageMediaId;

      if (hasMediaId) {
        if (
          requestedMediaId &&
          String(requestedMediaId) ===
            String(previousMediaId || "")
        ) {
          // Same image: verify its current attachment.
          await verifyCurrentCourseImage(
            requestedMediaId,
            course._id,
            course.coverImage,
            session
          );

          if (
            payload.coverImage !== undefined &&
            payload.coverImage !==
              course.coverImage
          ) {
            fail(
              "Course cover image URL and media ID do not match.",
              409,
              "COURSE_MEDIA_URL_MISMATCH"
            );
          }
        } else {
          let nextUrl = "";

          if (requestedMediaId) {
            nextUrl = await attachCourseImage(
              requestedMediaId,
              course._id,
              actorId,
              session
            );

            if (
              payload.coverImage &&
              payload.coverImage !== nextUrl
            ) {
              fail(
                "Course cover image URL and media ID do not match.",
                409,
                "COURSE_MEDIA_URL_MISMATCH"
              );
            }
          } else if (payload.coverImage) {
            fail(
              "Removing an image requires an empty coverImage.",
              400,
              "COURSE_MEDIA_REMOVE_CONFLICT"
            );
          }

          if (previousMediaId) {
            await detachCourseImage(
              previousMediaId,
              course._id,
              session
            );
          }

          course.coverImage = nextUrl;
          course.coverImageMediaId =
            requestedMediaId || null;
        }

        delete payload.coverImage;
      } else if (
        payload.coverImage !== undefined
      ) {
        if (
          previousMediaId &&
          payload.coverImage !==
            course.coverImage
        ) {
          fail(
            "Use coverImageMediaId to replace or remove a managed image.",
            409,
            "COURSE_MEDIA_ID_REQUIRED"
          );
        }

        if (
          !previousMediaId &&
          payload.coverImage &&
          payload.coverImage !==
            course.coverImage
        ) {
          fail(
            "New course images require coverImageMediaId.",
            400,
            "COURSE_MEDIA_ID_REQUIRED"
          );
        }
      }

      Object.assign(course, payload);

      await course.save({ session });

      updated = course;
    }
  );

  return updated;
};


export const archiveCourse = async (id) => {
  const course = await getRecord(Course, id);

  const referenced = await Curriculum.exists({
    "semesters.courses.course": course._id,
    status: { $ne: "archived" },
  });

  if (referenced) {
    fail("Course is referenced by an active curriculum.", 409);
  }

  const prerequisiteOf = await Course.exists({
    prerequisites: course._id,
    isActive: true,
  });

  if (prerequisiteOf) {
    fail("Course is a prerequisite of another active course.", 409);
  }

  course.isActive = false;
  return course.save();
};

const validateCurriculum = async (data) => {
  const program = await getRecord(Program, data.program);

  if (!program.isActive) {
    fail("Program is inactive.", 409);
  }

  if (!Array.isArray(data.semesters) || data.semesters.length === 0) {
    fail("Curriculum must contain at least one semester.");
  }

  const allCourses = new Set();
  const semesterKeys = new Set();

  for (const semester of data.semesters) {
    const { yearNumber, semesterNumber, courses } = semester;

    if (
      !Number.isInteger(yearNumber) ||
      yearNumber < 1 ||
      !Number.isInteger(semesterNumber) ||
      semesterNumber < 1
    ) {
      fail("Invalid year or semester number.");
    }

    // Each year can have a flexible number of semesters.
    // Semester numbers are unique within each year.
    const semesterKey = `${yearNumber}:${semesterNumber}`;

    if (semesterKeys.has(semesterKey)) {
      fail("Duplicate semester in the same year.");
    }

    semesterKeys.add(semesterKey);

    if (!Array.isArray(courses) || courses.length === 0) {
      fail("Each semester must contain at least one course.");
    }

    const localCourses = new Set();
    const orders = new Set();

    for (const item of courses) {
      const courseId = String(item.course);

      if (localCourses.has(courseId)) {
        fail("Duplicate course in semester.");
      }

      if (orders.has(item.order)) {
        fail("Duplicate course order in semester.");
      }

      localCourses.add(courseId);
      allCourses.add(courseId);
      orders.add(item.order);
    }
  }

  const count = await Course.countDocuments({
    _id: { $in: [...allCourses] },
    isActive: true,
  });

  if (count !== allCourses.size) {
    fail("Curriculum references invalid or inactive courses.");
  }
};

export const createCurriculum = async (data) => {
  const program = await getRecord(Program, data.program);

  if (!program.isActive) {
    fail("Program is inactive.", 409);
  }

  return Curriculum.create({
    ...data,
    status: "draft",
  });
};
// ==================================================
// CLONE CURRICULUM AS DRAFT
// ==================================================

export const cloneCurriculumAsDraft = async (id, data) => {
  // 1. Find source curriculum
  const source = await getRecord(Curriculum, id);

  // 2. Only published curricula can be cloned
  if (source.status !== "published") {
    fail(
      "Only published curricula can be cloned as draft.",
      409,
      "CURRICULUM_NOT_PUBLISHED",
    );
  }

  // 3. Verify program is still active
  const program = await getRecord(Program, source.program);

  if (!program.isActive) {
    fail(
      "Cannot clone curriculum of an inactive program.",
      409,
      "PROGRAM_INACTIVE",
    );
  }

  // 4. Prevent duplicate versions
  const existing = await Curriculum.exists({
    program: source.program,
    version: data.version,
  });

  if (existing) {
    fail(
      "This curriculum version already exists.",
      409,
      "CURRICULUM_VERSION_EXISTS",
    );
  }

  // 5. Copy semesters and course references
  const semesters = source.semesters.map((semester) => ({
    yearNumber: semester.yearNumber,
    semesterNumber: semester.semesterNumber,

    courses: semester.courses.map((item) => ({
      course: item.course,
      courseType: item.courseType,
      order: item.order,
    })),
  }));

  // 6. Create independent draft version
  try {
    return await Curriculum.create({
      program: source.program,
      version: data.version,
      effectiveFrom: data.effectiveFrom,
      semesters,
      status: "draft",
    });
  } catch (error) {
    // Unique index protects against concurrent clones
    if (error.code === 11000) {
      fail(
        "This curriculum version already exists.",
        409,
        "CURRICULUM_VERSION_EXISTS",
      );
    }

    throw error;
  }
};
export const updateCurriculum = async (id, data) => {
  const curriculum = await getRecord(Curriculum, id);

  if (curriculum.status !== "draft") {
    fail("Only draft curricula can be edited.", 409);
  }

  Object.assign(curriculum, data);
  return curriculum.save();
};

export const publishCurriculum = async (id) => {
  const curriculum = await getRecord(Curriculum, id);

  if (curriculum.status !== "draft") {
    fail("Only draft curricula can be published.", 409);
  }

  await validateCurriculum(curriculum.toObject());

  curriculum.status = "published";
  return curriculum.save();
};

// ==================================================
// ARCHIVE CURRICULUM
// ==================================================

export const archiveCurriculum = async (id) => {
  const curriculum = await getRecord(Curriculum, id);

  // Already archived: idempotent response
  if (curriculum.status === "archived") {
    return curriculum;
  }

  // Never archive a curriculum referenced by any cohort.
  // This includes planned, active, completed and cancelled
  // cohorts to preserve historical references.
  const cohortCount = await Cohort.countDocuments({
    curriculum: curriculum._id,
  });

  if (cohortCount > 0) {
    fail(
      `Cannot archive curriculum. It is referenced by ${cohortCount} cohort(s).`,
      409,
      "CURRICULUM_IN_USE",
    );
  }

  curriculum.status = "archived";

  return curriculum.save();
};
// ==================================================
// PUBLISH PROGRAM
// ==================================================

export const publishProgram = async (id) => {
  const program = await getRecord(Program, id);

  if (!program.isActive) {
    fail("Archived program cannot be published.", 409, "PROGRAM_ARCHIVED");
  }

  if (program.isPublished) {
    fail("Program is already published.", 409, "PROGRAM_ALREADY_PUBLISHED");
  }

  const now = new Date();

  program.isPublished = true;

  // First publication timestamp
  if (!program.publishedAt) {
    program.publishedAt = now;
  }

  // Latest publication timestamp
  program.lastPublishedAt = now;

  return program.save();
};

// ==================================================
// UNPUBLISH PROGRAM
// ==================================================

export const unpublishProgram = async (id) => {
  const program = await getRecord(Program, id);

  if (!program.isActive) {
    fail("Archived program cannot be unpublished.", 409, "PROGRAM_ARCHIVED");
  }

  if (!program.isPublished) {
    fail("Program is not published.", 409, "PROGRAM_NOT_PUBLISHED");
  }

  program.isPublished = false;

  return program.save();
};
