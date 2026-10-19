
import { asyncHandler } from "../utils/asyncHandler.js";

import * as academic from "../services/academic.service.js";

const send = (res, data, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });

export const listRecords = type =>
  asyncHandler(async (req, res) => {
    const result = await academic.listAcademicRecords(
      type,
      req.query
    );
    return send(res, result);
  });

export const getRecord = type =>
  asyncHandler(async (req, res) => {
    const result = await academic.getAcademicRecord(
      type,
      req.params.id
    );
    return send(res, result);
  });

export const createProgram = asyncHandler(
  async (req, res) => {
    const result = await academic.createProgram(req.body);
    return send(res, result, 201);
  }
);

export const updateProgram = asyncHandler(
  async (req, res) => {
    const result = await academic.updateProgram(
      req.params.id, req.body
    );
    return send(res, result);
  }
);

export const archiveProgram = asyncHandler(
  async (req, res) => {
    const result = await academic.archiveProgram(
      req.params.id
    );
    return send(res, result);
  }
);

export const createCourse = asyncHandler(
  async (req, res) => {
    const result = await academic.createCourse(req.body);
    return send(res, result, 201);
  }
);

export const updateCourse = asyncHandler(
  async (req, res) => {
    const result = await academic.updateCourse(
      req.params.id, req.body
    );
    return send(res, result);
  }
);

export const archiveCourse = asyncHandler(
  async (req, res) => {
    const result = await academic.archiveCourse(
      req.params.id
    );
    return send(res, result);
  }
);

export const createCurriculum = asyncHandler(
  async (req, res) => {
    const result = await academic.createCurriculum(
      req.body
    );
    return send(res, result, 201);
  }
);
// ==================================================
// CLONE CURRICULUM AS DRAFT
// ==================================================

export const cloneCurriculumAsDraft = asyncHandler(
  async (req, res) => {
    const result =
      await academic.cloneCurriculumAsDraft(
        req.params.id,
        req.body
      );

    return send(res, result, 201);
  }
);
export const updateCurriculum = asyncHandler(
  async (req, res) => {
    const result = await academic.updateCurriculum(
      req.params.id, req.body
    );
    return send(res, result);
  }
);

export const publishCurriculum = asyncHandler(
  async (req, res) => {
    const result = await academic.publishCurriculum(
      req.params.id
    );
    return send(res, result);
  }
);

export const archiveCurriculum = asyncHandler(
  async (req, res) => {
    const result = await academic.archiveCurriculum(
      req.params.id
    );
    return send(res, result);
  }
);
// ==================================================
// PUBLISH PROGRAM
// ==================================================

export const publishProgram = asyncHandler(
  async (req, res) => {
    const result = await academic.publishProgram(
      req.params.id
    );

    return send(res, result);
  }
);

// ==================================================
// UNPUBLISH PROGRAM
// ==================================================

export const unpublishProgram = asyncHandler(
  async (req, res) => {
    const result = await academic.unpublishProgram(
      req.params.id
    );

    return send(res, result);
  }
);