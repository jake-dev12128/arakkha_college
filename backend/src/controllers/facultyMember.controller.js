
import * as facultyService from "../services/facultyMember.service.js";

import {
  createFacultySchema,
  updateFacultySchema,
  facultyIdSchema,
  facultyPublicationSchema,
} from "../schemas/facultyMember.schema.js";

const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

const validateId = (req) => {
  return facultyIdSchema.parse({
    id: req.params.id,
  }).id;
};

// ==================================================
// PUBLIC
// ==================================================

export const listPublicFaculty = async (req, res) => {
  const members =
    await facultyService.getPublicFacultyMembers();

  return sendSuccess(res, { members });
};

export const getPublicFaculty = async (req, res) => {
  const id = validateId(req);

  const member =
    await facultyService.getPublicFacultyMemberById(id);

  return sendSuccess(res, { member });
};

// ==================================================
// ADMIN
// ==================================================

export const listAdminFaculty = async (req, res) => {
  const members =
    await facultyService.getAllFacultyMembers();

  return sendSuccess(res, { members });
};

export const getAdminFaculty = async (req, res) => {
  const id = validateId(req);

  const member =
    await facultyService.getAdminFacultyMemberById(id);

  return sendSuccess(res, { member });
};

export const createFaculty = async (req, res) => {
  const payload = createFacultySchema.parse(req.body);

  const member =
    await facultyService.createFacultyMember(payload);

  return sendSuccess(res, { member }, 201);
};

export const updateFaculty = async (req, res) => {
  const id = validateId(req);
  const payload = updateFacultySchema.parse(req.body);

  const member =
    await facultyService.updateFacultyMember(id, payload);

  return sendSuccess(res, { member });
};

export const publishFaculty = async (req, res) => {
  const id = validateId(req);

  const { isPublished } =
    facultyPublicationSchema.parse(req.body);

  const member =
    await facultyService.setFacultyPublication(
      id,
      isPublished
    );

  return sendSuccess(res, { member });
};

export const deleteFaculty = async (req, res) => {
  const id = validateId(req);

  await facultyService.deleteFacultyMember(id);

  return sendSuccess(res, {
    message: "Faculty member deleted successfully.",
  });
};
