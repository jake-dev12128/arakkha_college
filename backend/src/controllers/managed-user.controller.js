
import {
  asyncHandler,
} from "../utils/asyncHandler.js";

import {
  createManagedUser,
  createAcademicAccount,
} from "../services/user.service.js";

// ==================================================
// CREATE ADMIN / SUPER ADMIN
// ==================================================

export const createManagedUserController =
  asyncHandler(async (req, res) => {
    const user = await createManagedUser({
      input: req.body,
      actor: req.user,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: { user },
    });
  });

// ==================================================
// CREATE TEACHER / STUDENT
// ==================================================

export const createAcademicAccountController =
  asyncHandler(async (req, res) => {
    const user = await createAcademicAccount({
      input: req.body,
      actor: req.user,
    });

    return res.status(201).json({
      success: true,
      message: "Academic account created successfully.",
      data: { user },
    });
  });
