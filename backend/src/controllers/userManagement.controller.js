
import mongoose from "mongoose";

import {
  listManagedUsers,
  getAdminDashboardStats,
  getManagedUser,
  updateManagedUser,
  deactivateManagedUser,
  reactivateManagedUser,
  permanentlyDeleteManagedUser,
} from "../services/userManagement.service.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

import {
  toPublicImageUrl,
} from "../utils/imageDelivery.js";

// ==================================================
// HELPERS
// ==================================================

const validateUserId = (id) => {
  if (
    typeof id !== "string" ||
    !mongoose.isObjectIdOrHexString(id)
  ) {
    throw new AppError(
      "Invalid user ID.",
      400,
      "INVALID_USER_ID"
    );
  }

  return id;
};

// ==================================================
// PROFILE IMAGE DELIVERY MAPPING
// ==================================================

// Preserve original Cloudinary URL and media ID.
// Add a display-only URL to user responses.
//
// This helper also handles lifecycle results
// that do not contain a user profile.

const withImageDelivery = (user) => {
  if (
    !user ||
    typeof user !== "object" ||
    Array.isArray(user)
  ) {
    return user;
  }

  // Avoid adding profile fields to lifecycle
  // metadata objects that are not user records.
  const isUserRecord =
    user._id != null ||
    user.id != null ||
    user.clerkId != null;

  if (!isUserRecord) {
    return user;
  }

  return {
    ...user,

    profileImageDeliveryUrl:
      typeof user.profileImage === "string" &&
      user.profileImage.trim()
        ? toPublicImageUrl(user.profileImage)
        : null,
  };
};

// ==================================================
// LIST MANAGED USERS
// GET /api/v1/admin/users
// ==================================================

export const listManagedUsersController =
  asyncHandler(async (req, res) => {
    const query =
      res.locals.userListQuery ?? req.query;

    const result =
      await listManagedUsers(query);

    return res.status(200).json({
      success: true,

      data: {
        ...result,

        users: Array.isArray(result.users)
          ? result.users.map(withImageDelivery)
          : result.users,
      },
    });
  });

// ==================================================
// GET MANAGED USER
// GET /api/v1/admin/users/:id
// ==================================================

export const getManagedUserController =
  asyncHandler(async (req, res) => {
    const userId = validateUserId(
      req.params.id
    );

    const user = await getManagedUser({
      userId,
      actor: req.user,
    });

    return res.status(200).json({
      success: true,

      data: {
        user: withImageDelivery(user),
      },
    });
  });

// ==================================================
// UPDATE MANAGED USER
// PATCH /api/v1/admin/users/:id
// ==================================================

export const updateManagedUserController =
  asyncHandler(async (req, res) => {
    const userId = validateUserId(
      req.params.id
    );

    const user = await updateManagedUser({
      userId,
      actor: req.user,
      input: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",

      data: {
        user: withImageDelivery(user),
      },
    });
  });

// ==================================================
// DEACTIVATE MANAGED USER
// PATCH /api/v1/admin/users/:id/deactivate
// ==================================================
//
// IMPORTANT:
// This controller is not exposed by the route
// until the lifecycle workflow is verified.
// ==================================================

export const deactivateManagedUserController =
  asyncHandler(async (req, res) => {
    const userId = validateUserId(
      req.params.id
    );

    const result =
      await deactivateManagedUser({
        userId,
        actor: req.user,
        reason: req.body.reason,
        req,
      });

    const reconciliationRequired =
      result.reconciliationRequired === true;

    const alreadyInactive =
      result.alreadyInactive === true;

    return res
      .status(
        reconciliationRequired ? 202 : 200
      )
      .json({
        success: true,

        message: reconciliationRequired
          ? "Account deactivation requires session reconciliation."
          : alreadyInactive
            ? "User is already inactive."
            : "User deactivated successfully.",

        data: {
          user: withImageDelivery(
            result.user ?? result
          ),

          lifecycle: {
            operationId:
              result.operationId ?? null,

            status:
              result.status ?? null,

            reconciliationRequired,

            alreadyInactive,
          },
        },
      });
  });

// ==================================================
// REACTIVATE MANAGED USER
// PATCH /api/v1/admin/users/:id/reactivate
// ==================================================
//
// The lifecycle service currently rejects
// reactivation until security reconciliation
// and activation checks are implemented.
// ==================================================

export const reactivateManagedUserController =
  asyncHandler(async (req, res) => {
    const userId = validateUserId(
      req.params.id
    );

    const result =
      await reactivateManagedUser({
        userId,
        actor: req.user,
        reason: req.body.reason,
      });

    return res.status(200).json({
      success: true,

      message: result.alreadyActive
        ? "User is already active."
        : "User reactivated successfully.",

      data: {
        user: withImageDelivery(
          result.user ?? result
        ),

        alreadyActive:
          result.alreadyActive === true,
      },
    });
  });

// ==================================================
// PERMANENT DELETE MANAGED USER
// DELETE /api/v1/admin/users/:id
// ==================================================
//
// Restricted to super_admin.
//
// The service must validate all dependencies
// and retention requirements before deletion.
// ==================================================

export const permanentlyDeleteManagedUserController =
  asyncHandler(async (req, res) => {
    const userId = validateUserId(
      req.params.id
    );

    const result =
      await permanentlyDeleteManagedUser({
        userId,
        actor: req.user,
        reason: req.body.reason,
        confirmation:
          req.body.confirmation,
      });

    return res.status(200).json({
      success: true,
      message:
        "User permanently deleted.",

      data: {
        result,
      },
    });
  });

// ==================================================
// ADMIN DASHBOARD STATISTICS
// GET /api/v1/admin/dashboard/stats
// ==================================================

export const getAdminDashboardStatsController =
  asyncHandler(async (req, res) => {
    const stats =
      await getAdminDashboardStats();

    return res.status(200).json({
      success: true,

      data: {
        stats,
      },
    });
  });
