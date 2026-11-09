
import * as service from "../services/collaborationPartner.service.js";

import {
  createCollaborationSchema,
  updateCollaborationSchema,
  collaborationIdSchema,
  collaborationPublicationSchema,
} from "../schemas/collaborationPartner.schema.js";

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
  validate(collaborationIdSchema, {
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

export const listPublicCollaborations = async (req, res) => {
  const partners = await service.getPublicPartners();

  return sendSuccess(res, { partners });
};

export const getPublicCollaboration = async (req, res) => {
  const id = validateId(req);

  const partner = await service.getPublicPartnerById(id);

  return sendSuccess(res, { partner });
};

// ==================================================
// ADMIN
// ==================================================

export const listAdminCollaborations = async (req, res) => {
  const partners = await service.getAllPartners();

  return sendSuccess(res, { partners });
};

export const getAdminCollaboration = async (req, res) => {
  const id = validateId(req);

  const partner = await service.getAdminPartnerById(id);

  return sendSuccess(res, { partner });
};

// ==================================================
// CREATE
// ==================================================

export const createCollaboration = async (req, res) => {
  const actorId = getActorId(req);

  const payload = validate(
    createCollaborationSchema,
    req.body
  );

  const partner = await service.createPartner(
    payload,
    actorId
  );

  return sendSuccess(res, { partner }, 201);
};

// ==================================================
// UPDATE / REPLACE / REMOVE IMAGE
// ==================================================

export const updateCollaboration = async (req, res) => {
  const actorId = getActorId(req);
  const id = validateId(req);

  const payload = validate(
    updateCollaborationSchema,
    req.body
  );

  const partner = await service.updatePartner(
    id,
    payload,
    actorId
  );

  return sendSuccess(res, { partner });
};

// ==================================================
// PUBLISH / UNPUBLISH
// ==================================================

export const publishCollaboration = async (req, res) => {
  const id = validateId(req);

  const { isPublished } = validate(
    collaborationPublicationSchema,
    req.body
  );

  const partner = await service.setPartnerPublication(
    id,
    isPublished
  );

  return sendSuccess(res, { partner });
};

// ==================================================
// DELETE
// ==================================================

export const deleteCollaboration = async (req, res) => {
  const id = validateId(req);

  await service.deletePartner(id);

  return sendSuccess(res, {
    message: "Collaboration partner deleted successfully.",
  });
};
