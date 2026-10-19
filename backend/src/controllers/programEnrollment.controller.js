
import { asyncHandler } from "../utils/asyncHandler.js";

import * as service from "../services/programEnrollment.service.js";

export const createProgramEnrollment = asyncHandler(
  async (req, res) => {
    const data = await service.createProgramEnrollment(
      req.body,
    );

    return res.status(201).json({
      success: true,
      data,
    });
  },
);

export const listProgramEnrollments = asyncHandler(
  async (req, res) => {
    const data = await service.listProgramEnrollments(
      res.locals.validatedQuery,
    );

    return res.status(200).json({
      success: true,
      data,
    });
  },
);

export const getProgramEnrollment = asyncHandler(
  async (req, res) => {
    const data = await service.getProgramEnrollment(
      res.locals.validatedParams.id,
    );

    return res.status(200).json({
      success: true,
      data,
    });
  },
);

export const updateProgramEnrollment = asyncHandler(
  async (req, res) => {
    const data = await service.updateProgramEnrollment(
      res.locals.validatedParams.id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      data,
    });
  },
);
