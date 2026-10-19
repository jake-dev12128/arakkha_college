
import { asyncHandler } from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import * as aboutService from "../services/about.service.js";

const send = (res, data) =>
  res.status(200).json({
    success: true,
    data,
  });

export const publicAbout = asyncHandler(
  async (req, res) => {
    const about = await aboutService.getPublicAbout();

    if (!about) {
      throw new AppError(
        "Published About Us content is not available.",
        404,
        "ABOUT_NOT_FOUND"
      );
    }

    send(res, about);
  }
);

export const adminAbout = asyncHandler(
  async (req, res) => {
    send(res, await aboutService.getAdminAbout());
  }
);

export const saveAbout = asyncHandler(
  async (req, res) => {
    const about = await aboutService.saveAbout(
      req.body,
      req.user._id
    );

    send(res, about);
  }
);

export const publishAbout = asyncHandler(
  async (req, res) => {
    send(
      res,
      await aboutService.publishAbout(req.user._id)
    );
  }
);

export const unpublishAbout = asyncHandler(
  async (req, res) => {
    send(
      res,
      await aboutService.unpublishAbout(req.user._id)
    );
  }
);
