import api from "../api/api.js";

// ==================================================
// PUBLIC ACADEMIC SERVICE
// ==================================================

const unwrap = (response) =>
  response.data?.data ?? response.data;

// GET ALL PUBLISHED PROGRAMS
export const getPublicPrograms = async (signal) => {
  const response = await api.get(
    "/public/programs",
    { signal }
  );

  return unwrap(response);
};

// GET SINGLE PUBLISHED PROGRAM
export const getPublicProgram = async (id, signal) => {
  const response = await api.get(
    `/public/programs/${encodeURIComponent(id)}`,
    { signal }
  );

  return unwrap(response);
};

// STUDENT / TEACHER ONLY
export const getPublishedProgramCourses = async (
  programId,
  signal
) => {
  const response = await api.get(
    `/public/programs/${encodeURIComponent(programId)}/courses`,
    { signal }
  );

  return unwrap(response);
};