
import { asyncHandler } from "../utils/asyncHandler.js";

import * as service from "../services/academicOperations.service.js";

const send = (res, data, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });

// ACADEMIC YEARS

export const createAcademicYear = asyncHandler(
  async (req, res) => {
    const result = await service.createAcademicYear(req.body);
    return send(res, result, 201);
  },
);

export const listAcademicYears = asyncHandler(
  async (req, res) => {
    const result = await service.listAcademicYears(
      res.locals.validatedQuery,
    );
    return send(res, result);
  },
);

export const getAcademicYear = asyncHandler(
  async (req, res) => {
    const result = await service.getAcademicYear(
      res.locals.validatedParams.id,
    );
    return send(res, result);
  },
);

export const updateAcademicYear = asyncHandler(
  async (req, res) => {
    const result = await service.updateAcademicYear(
      res.locals.validatedParams.id,
      req.body,
    );
    return send(res, result);
  },
);
// ==================================================
// ACTIVATE ACADEMIC YEAR
// ==================================================

export const activateAcademicYear = asyncHandler(
  async (req, res) => {
    const result = await service.activateAcademicYear(
      res.locals.validatedParams.id,
    );

    return send(res, result);
  },
);

// ==================================================
// COMPLETE ACADEMIC YEAR
// ==================================================

export const completeAcademicYear = asyncHandler(
  async (req, res) => {
    const result = await service.completeAcademicYear(
      res.locals.validatedParams.id,
    );

    return send(res, result);
  },
);
// COHORTS

export const createCohort = asyncHandler(
  async (req, res) => {
    const result = await service.createCohort(req.body);
    return send(res, result, 201);
  },
);

export const listCohorts = asyncHandler(
  async (req, res) => {
    const result = await service.listCohorts(
      res.locals.validatedQuery,
    );
    return send(res, result);
  },
);

export const getCohort = asyncHandler(
  async (req, res) => {
    const result = await service.getCohort(
      res.locals.validatedParams.id,
    );
    return send(res, result);
  },
);

export const updateCohort = asyncHandler(
  async (req, res) => {
    const result = await service.updateCohort(
      res.locals.validatedParams.id,
      req.body,
    );
    return send(res, result);
  },
);
