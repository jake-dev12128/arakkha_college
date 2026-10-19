
import { asyncHandler } from "../utils/asyncHandler.js";
import * as service from "../services/entrance.service.js";

import EntranceInformation from "../models/entranceInformation.model.js";
import EntranceList from "../models/entranceList.model.js";

const send = (res, data, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });

const actor = (req) => req.user._id;

// ENTRANCE INFORMATION

export const createInformation = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.createInformation(req.body, actor(req)),
      201
    )
);

export const updateInformation = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.updateInformation(
        req.params.id,
        req.body,
        actor(req)
      )
    )
);

// ENTRANCE LIST

export const createList = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.createList(req.body, actor(req)),
      201
    )
);

export const updateList = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.updateList(
        req.params.id,
        req.body,
        actor(req)
      )
    )
);

// APPLICANTS

export const createApplicant = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.createApplicant(
        req.params.id,
        req.body
      ),
      201
    )
);

export const updateApplicant = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.updateApplicant(
        req.params.id,
        req.params.applicantId,
        req.body
      )
    )
);

export const deleteApplicant = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.deleteApplicant(
        req.params.id,
        req.params.applicantId
      )
    )
);

export const listApplicants = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.listApplicantsAdmin(
        req.params.id,
        res.locals.validatedQuery
      )
    )
);

// PUBLIC

export const publicInformation = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.publicInformation(req.params.year)
    )
);

export const publicApplicants = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.publicApplicants(
        req.params.year,
        res.locals.validatedQuery
      )
    )
);

// ADMIN READ

export const listInformation = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.listAdmin(
        EntranceInformation,
        res.locals.validatedQuery
      )
    )
);

export const listLists = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.listAdmin(
        EntranceList,
        res.locals.validatedQuery
      )
    )
);

export const detailInformation = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.detailAdmin(
        EntranceInformation,
        req.params.id
      )
    )
);

export const detailList = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.detailAdmin(
        EntranceList,
        req.params.id
      )
    )
);

// PUBLICATION

export const publishInformation = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.setPublication(
        EntranceInformation,
        req.params.id,
        "publish",
        actor(req)
      )
    )
);

export const archiveInformation = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.setPublication(
        EntranceInformation,
        req.params.id,
        "archive",
        actor(req)
      )
    )
);

export const publishList = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.setPublication(
        EntranceList,
        req.params.id,
        "publish",
        actor(req)
      )
    )
);

export const archiveList = asyncHandler(
  async (req, res) =>
    send(
      res,
      await service.setPublication(
        EntranceList,
        req.params.id,
        "archive",
        actor(req)
      )
    )
);
