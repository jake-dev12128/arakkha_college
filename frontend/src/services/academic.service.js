
import api from "../api/api.js";

// ==================================================
// ACADEMIC API CONFIGURATION
// ==================================================

const ACADEMIC_BASE_URL = "/admin";

const SAFE_DELETE_BASE_URL =
  "/admin/academic-delete";

// ==================================================
// SUPPORTED ACADEMIC RESOURCES
// ==================================================

export const ACADEMIC_RESOURCES = Object.freeze({
  PROGRAMS: "programs",
  COURSES: "courses",
  CURRICULA: "curricula",
  ACADEMIC_YEARS: "academic-years",
  COHORTS: "cohorts",
  PROGRAM_ENROLLMENTS: "program-enrollments",
});

// ==================================================
// HELPERS
// ==================================================

const VALID_RESOURCES = new Set(
  Object.values(ACADEMIC_RESOURCES),
);

const validateResource = (resource) => {
  if (!VALID_RESOURCES.has(resource)) {
    throw new Error(
      `Unsupported academic resource: ${resource}`,
    );
  }

  return resource;
};

const validateId = (id) => {
  if (
    typeof id !== "string" ||
    !/^[a-f\d]{24}$/i.test(id)
  ) {
    throw new Error(
      "A valid MongoDB record ID is required.",
    );
  }

  return id;
};

const getResourceUrl = (resource) => {
  validateResource(resource);

  return `${ACADEMIC_BASE_URL}/${resource}`;
};

const unwrapResponse = (response) => {
  return response.data?.data ?? response.data;
};

// ==================================================
// LIST ACADEMIC RECORDS
// ==================================================

const list = async (
  resource,
  params = {},
  signal,
) => {
  const response = await api.get(
    getResourceUrl(resource),
    {
      params,
      signal,
    },
  );

  return unwrapResponse(response);
};

// ==================================================
// GET SINGLE ACADEMIC RECORD
// ==================================================

const getById = async (
  resource,
  id,
  signal,
) => {
  const response = await api.get(
    `${getResourceUrl(resource)}/${validateId(id)}`,
    {
      signal,
    },
  );

  return unwrapResponse(response);
};

// ==================================================
// CREATE ACADEMIC RECORD
// ==================================================

const create = async (
  resource,
  payload,
) => {
  const response = await api.post(
    getResourceUrl(resource),
    payload,
  );

  return unwrapResponse(response);
};

// ==================================================
// UPDATE ACADEMIC RECORD
// ==================================================

const update = async (
  resource,
  id,
  payload,
) => {
  const response = await api.patch(
    `${getResourceUrl(resource)}/${validateId(id)}`,
    payload,
  );

  return unwrapResponse(response);
};

// ==================================================
// ARCHIVE ACADEMIC RECORD
// ==================================================

const archive = async (resource, id) => {
  validateResource(resource);

  const recordId = validateId(id);

  if (
    !["programs", "courses", "curricula"].includes(resource)
  ) {
    throw new Error(
      `Archive is not supported for ${resource}.`
    );
  }

  const url =
    `${getResourceUrl(resource)}/${recordId}/archive`;

  const response =
    resource === "curricula"
      ? await api.post(url)
      : await api.patch(url);

  return unwrapResponse(response);
};

// ==================================================
// PUBLISH ACADEMIC RECORD
// ==================================================
// ==================================================
// PUBLISH ACADEMIC RECORD
// PROGRAMS / CURRICULA
// ==================================================

const publish = async (resource, id) => {
  validateResource(resource);

  const recordId = validateId(id);

  if (!["programs", "curricula"].includes(resource)) {
    throw new Error(
      `Publish is not supported for ${resource}.`
    );
  }

  const response = await api.post(
    `${getResourceUrl(resource)}/${recordId}/publish`
  );

  return unwrapResponse(response);
};

// ==================================================
// UNPUBLISH PROGRAM
// ==================================================

const unpublish = async (resource, id) => {
  validateResource(resource);

  if (resource !== "programs") {
    throw new Error(
      "Unpublish is only supported for programs."
    );
  }

  const recordId = validateId(id);

  const response = await api.post(
    `${getResourceUrl(resource)}/${recordId}/unpublish`
  );

  return unwrapResponse(response);
};
// ==================================================
// GET DELETE ELIGIBILITY
// ==================================================

const getDeleteEligibility = async (
  resource,
  id,
  signal,
) => {
  validateResource(resource);
  validateId(id);

  const response = await api.get(
    `${SAFE_DELETE_BASE_URL}/${resource}/${id}/eligibility`,
    {
      signal,
    },
  );

  return unwrapResponse(response);
};

// ==================================================
// SAFE DELETE
// ==================================================

const safeDelete = async (
  resource,
  id,
) => {
  validateResource(resource);
  validateId(id);

  const response = await api.delete(
    `${SAFE_DELETE_BASE_URL}/${resource}/${id}`,
  );

  return unwrapResponse(response);
};

// ==================================================
// ERROR MESSAGE HELPER
// ==================================================

export const getAcademicApiErrorMessage = (
  error,
  fallback = "An unexpected error occurred.",
) => {
  const data = error?.response?.data;

  if (
    Array.isArray(data?.errors) &&
    data.errors.length > 0
  ) {
    return data.errors
      .map((issue) => {
        const field = issue?.field
          ? `${issue.field}: `
          : "";

        return (
          `${field}${issue?.message || "Invalid value."}`
        );
      })
      .join("\n");
  }

  if (
    typeof data?.message === "string" &&
    data.message.trim()
  ) {
    return data.message;
  }

  return error?.message || fallback;
};
// ==================================================
// CLONE CURRICULUM AS DRAFT
// ==================================================

const cloneCurriculumAsDraft = async (id, payload) => {
  const recordId = validateId(id);

  const response = await api.post(
    `${getResourceUrl("curricula")}/${recordId}/clone`,
    payload,
  );

  return unwrapResponse(response);
};

// ==================================================
// ACADEMIC YEAR LIFECYCLE
// ==================================================

const activateAcademicYear = async (id) => {
  const recordId = validateId(id);

  const response = await api.post(
    `${getResourceUrl(
      ACADEMIC_RESOURCES.ACADEMIC_YEARS
    )}/${recordId}/activate`
  );

  return unwrapResponse(response);
};

const completeAcademicYear = async (id) => {
  const recordId = validateId(id);

  const response = await api.post(
    `${getResourceUrl(
      ACADEMIC_RESOURCES.ACADEMIC_YEARS
    )}/${recordId}/complete`
  );

  return unwrapResponse(response);
};
// ==================================================
// EXPORT SERVICE
// ==================================================

export const academicService = {
  list,
  getById,
  create,
  update,
  archive,
  publish,
  unpublish,
  getDeleteEligibility,  cloneCurriculumAsDraft,

  // Academic Year Lifecycle
  activateAcademicYear,
  completeAcademicYear,
  safeDelete,
};
export default academicService;
