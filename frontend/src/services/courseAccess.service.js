
import api from "../api/api.js";

// ==================================================
// CONSTANTS
// ==================================================

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const API_PATHS = {
  assignments: "/admin/course-assignments",

  assignTeacher:
    "/admin/course-assignments/teachers",

  assignStudent:
    "/admin/course-assignments/students",

  teacherCourses: "/teacher/courses",

  studentCourses: "/student/courses",
};

// ==================================================
// HELPERS
// ==================================================

const validateObjectId = (value, fieldName) => {
  if (
    typeof value !== "string" ||
    !OBJECT_ID_REGEX.test(value)
  ) {
    throw new Error(
      `${fieldName} must be a valid MongoDB ObjectId.`,
    );
  }

  return value;
};

const unwrapData = (response) => {
  if (!response?.data?.success) {
    throw new Error(
      response?.data?.message ||
        "API request failed.",
    );
  }

  return response.data.data;
};

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const validatePagination = (page, limit) => {
  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);

  if (
    !Number.isInteger(normalizedPage) ||
    normalizedPage < 1
  ) {
    throw new Error(
      "Page must be a positive integer.",
    );
  }

  if (
    !Number.isInteger(normalizedLimit) ||
    normalizedLimit < 1 ||
    normalizedLimit > 100
  ) {
    throw new Error(
      "Limit must be between 1 and 100.",
    );
  }

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  };
};

// ==================================================
// COURSE ACCESS SERVICE
// ==================================================

export const courseAccessService = {
  // ==================================================
  // ADMIN / SUPER ADMIN
  // ==================================================

  /**
   * Get all course assignments.
   *
   * GET /api/v1/admin/course-assignments
   *
   * Supported filters:
   * - page
   * - limit
   * - courseId
   * - teacherId
   * - isActive
   */
  async getAllAssignments(
    {
      page = 1,
      limit = 20,
      courseId,
      teacherId,
      isActive,
    } = {},
    signal,
  ) {
    const pagination = validatePagination(
      page,
      limit,
    );

    const params = {
      ...pagination,
    };

    if (courseId) {
      params.courseId = validateObjectId(
        courseId,
        "courseId",
      );
    }

    if (teacherId) {
      params.teacherId = validateObjectId(
        teacherId,
        "teacherId",
      );
    }

    if (typeof isActive === "boolean") {
      params.isActive = String(isActive);
    }

    const response = await api.get(
      API_PATHS.assignments,
      {
        params,
        signal,
      },
    );

    const data = unwrapData(response);

    return {
      assignments: normalizeArray(
        data?.assignments,
      ),

      pagination: data?.pagination ?? {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: 0,
      },
    };
  },

  /**
   * Assign a teacher to a course.
   *
   * POST /api/v1/admin/course-assignments/teachers
   */
  async assignTeacher({
  courseId,
  teacherId,
  cohortId,
}) {
  validateObjectId(courseId, "courseId");
  validateObjectId(teacherId, "teacherId");
  validateObjectId(cohortId, "cohortId");

  const response = await api.post(
    API_PATHS.assignTeacher,
    {
      courseId,
      teacherId,
      cohortId,
    },
  );

  return unwrapData(response).assignment;
},

  /**
   * Assign a student to an existing
   * active course assignment.
   *
   * POST /api/v1/admin/course-assignments/students
   */
  async assignStudent({
    assignmentId,
    studentId,
  }) {
    validateObjectId(
      assignmentId,
      "assignmentId",
    );

    validateObjectId(
      studentId,
      "studentId",
    );

    const response = await api.post(
      API_PATHS.assignStudent,
      {
        assignmentId,
        studentId,
      },
    );

    return unwrapData(response).assignment;
  },

  /**
   * Remove a student from a course assignment.
   *
   * DELETE
   * /api/v1/admin/course-assignments/
   * :assignmentId/students/:studentId
   */
  async removeStudent({
    assignmentId,
    studentId,
  }) {
    validateObjectId(
      assignmentId,
      "assignmentId",
    );

    validateObjectId(
      studentId,
      "studentId",
    );

    const response = await api.delete(
      `${API_PATHS.assignments}/${assignmentId}` +
        `/students/${studentId}`,
    );

    return unwrapData(response).assignment;
  },

  /**
   * Revoke a teacher's course assignment.
   *
   * PATCH
   * /api/v1/admin/course-assignments/:assignmentId/revoke
   */
  async revokeAssignment(assignmentId) {
    validateObjectId(
      assignmentId,
      "assignmentId",
    );

    const response = await api.patch(
      `${API_PATHS.assignments}/${assignmentId}/revoke`,
    );

    return unwrapData(response).assignment;
  },

  // ==================================================
  // TEACHER
  // ==================================================

  /**
   * Get courses assigned to the
   * authenticated teacher.
   *
   * GET /api/v1/teacher/courses
   *
   * Response:
   * [
   *   {
   *     assignmentId,
   *     course: {
   *       _id,
   *       code,
   *       title,
   *       description,
   *       credits
   *     }
   *   }
   * ]
   */
  async getTeacherCourses(signal) {
    const response = await api.get(
      API_PATHS.teacherCourses,
      {
        signal,
      },
    );

    const data = unwrapData(response);

    return normalizeArray(
      data?.courses,
    );
  },

  /**
   * Get students assigned to the
   * authenticated teacher's course.
   *
   * GET
   * /api/v1/teacher/course-assignments/
   * :assignmentId/students
   */
  async getTeacherCourseStudents(
    assignmentId,
    signal,
  ) {
    validateObjectId(
      assignmentId,
      "assignmentId",
    );

    const response = await api.get(
      `/teacher/course-assignments/${assignmentId}/students`,
      {
        signal,
      },
    );

    const data = unwrapData(response);

    return normalizeArray(
      data?.students,
    );
  },

  // ==================================================
  // STUDENT
  // ==================================================

  /**
   * Get courses assigned to the
   * authenticated student.
   *
   * GET /api/v1/student/courses
   */
  async getStudentCourses(signal) {
    const response = await api.get(
      API_PATHS.studentCourses,
      {
        signal,
      },
    );

    const data = unwrapData(response);

    return normalizeArray(
      data?.courses,
    );
  },
};

// ==================================================
// DEFAULT EXPORT
// ==================================================

export default courseAccessService;
