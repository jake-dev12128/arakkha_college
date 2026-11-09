
import * as facultyService from "../services/facultyMember.service.js";

import {
  createFacultySchema,
  updateFacultySchema,
  facultyIdSchema,
  facultyPublicationSchema,
} from "../schemas/facultyMember.schema.js";

const sendSuccess = (res, data, statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    data,
  });

const validate = (schema, value) => {
  const result = schema.safeParse(value);

  if (!result.success) {
    const error = new Error("Validation failed.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.isOperational = true;
    error.details = result.error.issues;
    throw error;
  }

  return result.data;
};

const validateId = (req) =>
  validate(facultyIdSchema, {
    id: req.params.id,
  }).id;

const getActorId = (req) => {
  if (!req.user?._id) {
    const error = new Error("Authentication required.");
    error.statusCode = 401;
    error.code = "AUTHENTICATION_REQUIRED";
    error.isOperational = true;
    throw error;
  }

  return req.user._id;
};

// ==================================================
// PUBLIC
// ==================================================

export const listPublicFaculty = async (req, res) => {
  const members = await facultyService.getPublicFacultyMembers();

  return sendSuccess(res, { members });
};

export const getPublicFaculty = async (req, res) => {
  const id = validateId(req);

  const member = await facultyService.getPublicFacultyMemberById(id);

  return sendSuccess(res, { member });
};

// ==================================================
// ADMIN
// ==================================================

export const listAdminFaculty = async (req, res) => {
  const members = await facultyService.getAllFacultyMembers();

  return sendSuccess(res, { members });
};

export const getAdminFaculty = async (req, res) => {
  const id = validateId(req);

  const member = await facultyService.getAdminFacultyMemberById(id);

  return sendSuccess(res, { member });
};

// ==================================================
// CREATE
// ==================================================

export const createFaculty = async (req, res) => {
  const actorId = getActorId(req);

  const payload = validate(
    createFacultySchema,
    req.body
  );

  const member = await facultyService.createFacultyMember(
    payload,
    actorId
  );

  return sendSuccess(res, { member }, 201);
};

// ==================================================
// UPDATE / REPLACE / REMOVE IMAGE
// ==================================================

export const updateFaculty = async (req, res) => {
  const actorId = getActorId(req);
  const id = validateId(req);

  const payload = validate(
    updateFacultySchema,
    req.body
  );

  const member = await facultyService.updateFacultyMember(
    id,
    payload,
    actorId
  );

  return sendSuccess(res, { member });
};

// ==================================================
// PUBLISH / UNPUBLISH
// ==================================================

export const publishFaculty = async (req, res) => {
  const id = validateId(req);

  const { isPublished } = validate(
    facultyPublicationSchema,
    req.body
  );

  const member = await facultyService.setFacultyPublication(
    id,
    isPublished
  );

  return sendSuccess(res, { member });
};

// ==================================================
// DELETE
// ==================================================

export const deleteFaculty = async (req, res) => {
  const id = validateId(req);

  await facultyService.deleteFacultyMember(id);

  return sendSuccess(res, {
    message: "Faculty member deleted successfully.",
  });
};
