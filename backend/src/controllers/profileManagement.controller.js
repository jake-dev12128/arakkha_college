
import mongoose from "mongoose";

import User from "../models/user.model.js";
import Student from "../models/student.model.js";
import Teacher from "../models/teacher.model.js";

import AppError from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deactivateUserLifecycle,
} from "../services/userLifecycle.service.js";
// ==================================================
// CONSTANTS
// ==================================================

const USER_PUBLIC_FIELDS =
  "_id firstName lastName email studentId role isActive createdAt";

const PROFILE_ROLES = new Set([
  "student",
  "teacher",
]);

// ==================================================
// MODEL RESOLVER
// ==================================================

const modelFor = (role) => {
  if (!PROFILE_ROLES.has(role)) {
    throw new AppError(
      "Unsupported profile role.",
      400,
      "INVALID_PROFILE_ROLE"
    );
  }

  return role === "student"
    ? Student
    : Teacher;
};

// ==================================================
// HELPERS
// ==================================================

const ensureId = (id) => {
  if (
    typeof id !== "string" ||
    !mongoose.isObjectIdOrHexString(id)
  ) {
    throw new AppError(
      "Invalid MongoDB ID.",
      400,
      "INVALID_ID"
    );
  }

  return id;
};

const escapeRegex = (value) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const findProfile = async (role, id) => {
  ensureId(id);

  const profile = await modelFor(role)
    .findById(id)
    .lean();

  if (!profile) {
    throw new AppError(
      "Profile not found.",
      404,
      "PROFILE_NOT_FOUND"
    );
  }

  return profile;
};

const findLinkedUser = async (
  role,
  userId
) => {
  const user = await User.findOne({
    _id: userId,
    role,
  })
    .select(USER_PUBLIC_FIELDS)
    .lean();

  if (!user) {
    throw new AppError(
      "Linked user account not found.",
      404,
      "USER_NOT_FOUND"
    );
  }

  return user;
};

// ==================================================
// LIST STUDENTS / TEACHERS
//
// GET /api/v1/admin/students
// GET /api/v1/admin/teachers
// ==================================================

export const listProfiles = (role) =>
  asyncHandler(async (req, res) => {
    const {
      search,
      status = "all",
      page = 1,
      limit = 10,
    } = res.locals.profileQuery ?? {};

    const filter = {
      role,
    };

    // ----------------------------------------------
    // STATUS FILTER
    // ----------------------------------------------

    if (status !== "all") {
      filter.isActive =
        status === "active";
    }

    // ----------------------------------------------
    // SEARCH FILTER
    // ----------------------------------------------

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        "i"
      );

      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },

        ...(role === "student"
          ? [{ studentId: regex }]
          : []),
      ];
    }

    // ----------------------------------------------
    // PAGINATION
    // ----------------------------------------------

    const skip = (page - 1) * limit;

    const [users, total] =
      await Promise.all([
        User.find(filter)
          .select(USER_PUBLIC_FIELDS)
          .sort({
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        User.countDocuments(filter),
      ]);

    // ----------------------------------------------
    // FETCH RELATED PROFILES
    // ----------------------------------------------

    const userIds = users.map(
      (user) => user._id
    );

    const profiles = userIds.length
      ? await modelFor(role)
          .find({
            userId: {
              $in: userIds,
            },
          })
          .select("_id userId")
          .lean()
      : [];

    // ----------------------------------------------
    // PROFILE LOOKUP
    // ----------------------------------------------

    const profileMap = new Map(
      profiles.map((profile) => [
        String(profile.userId),
        String(profile._id),
      ])
    );

    // ----------------------------------------------
    // ENRICH USERS
    // ----------------------------------------------

    const enrichedUsers = users.map(
      (user) => {
        const profileId =
          profileMap.get(
            String(user._id)
          ) ?? null;

        return {
          ...user,
          profileId,
          hasProfile: Boolean(profileId),
        };
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        users: enrichedUsers,

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(
            total / limit
          ),
        },
      },
    });
  });

// ==================================================
// GET PROFILE BY PROFILE ID
//
// GET /api/v1/admin/students/:id
// GET /api/v1/admin/teachers/:id
// ==================================================

export const getProfile = (role) =>
  asyncHandler(async (req, res) => {
    const profile = await findProfile(
      role,
      req.params.id
    );

    const user = await findLinkedUser(
      role,
      profile.userId
    );

    return res.status(200).json({
      success: true,
      data: {
        profile,
        user,
      },
    });
  });

// ==================================================
// GET PROFILE BY USER ID
//
// GET /api/v1/admin/students/by-user/:userId
// GET /api/v1/admin/teachers/by-user/:userId
// ==================================================

export const getProfileByUserId = (role) =>
  asyncHandler(async (req, res) => {
    const userId = ensureId(
      req.params.userId
    );

    // IMPORTANT:
    // Return complete public identity fields.
    //
    // ProfileForm edit mode needs:
    // firstName, lastName, email.

    const user = await findLinkedUser(
      role,
      userId
    );

    const profile = await modelFor(role)
      .findOne({
        userId: user._id,
      })
      .lean();

    if (!profile) {
      throw new AppError(
        "Profile not found. Backfill may be required for older accounts.",
        404,
        "PROFILE_NOT_FOUND"
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        profile,
        user,
      },
    });
  });

// ==================================================
// UPDATE STUDENT / TEACHER PROFILE
//
// PATCH /api/v1/admin/students/:id
// PATCH /api/v1/admin/teachers/:id
// ==================================================

export const updateProfile = (role) =>
  asyncHandler(async (req, res) => {
    const existing = await findProfile(
      role,
      req.params.id
    );

    const user = await findLinkedUser(
      role,
      existing.userId
    );

    // ----------------------------------------------
    // VERIFY ACCOUNT STATUS
    // ----------------------------------------------

    if (!user.isActive) {
      throw new AppError(
        "Cannot update an inactive account. Reactivate it first.",
        409,
        "ACCOUNT_INACTIVE"
      );
    }

    // ----------------------------------------------
    // ALLOWED PERSONAL FIELDS
    // ----------------------------------------------
    //
    // Never allow client-provided:
    // userId, role, email, firstName,
    // lastName, studentId or isActive.
    //
    // Identity changes are handled by the
    // User Management Service.
    // ----------------------------------------------

    const allowedFields = [
      "address",
      "currentAddress",
      "age",
      "fatherName",
      "motherName",
      "nationalId",
      "dateOfBirth",
      "gender",

      ...(role === "student"
        ? ["matriculationScores"]
        : []),
    ];

    const allowedSet = new Set(
      allowedFields
    );

    const payload = {};

    for (const [key, value] of Object.entries(
      req.body
    )) {
      if (!allowedSet.has(key)) {
        throw new AppError(
          `Field "${key}" cannot be updated through this endpoint.`,
          400,
          "PROFILE_FIELD_NOT_ALLOWED"
        );
      }

      payload[key] = value;
    }

    if (Object.keys(payload).length === 0) {
      throw new AppError(
        "At least one profile field is required.",
        400,
        "EMPTY_PROFILE_UPDATE"
      );
    }

    // ----------------------------------------------
    // UPDATE PROFILE
    // ----------------------------------------------

    const profile = await modelFor(role)
      .findOneAndUpdate(
        {
          _id: existing._id,
          userId: existing.userId,
        },
        {
          $set: payload,
        },
        {
          new: true,
          runValidators: true,
        }
      )
      .lean();

    if (!profile) {
      throw new AppError(
        "Profile not found.",
        404,
        "PROFILE_NOT_FOUND"
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully.",
      data: {
        profile,
        user,
      },
    });
  });

// ==================================================
// DEACTIVATE STUDENT / TEACHER
//
// PATCH /api/v1/admin/students/:id/deactivate
// PATCH /api/v1/admin/teachers/:id/deactivate
// ==================================================
//
// SAFETY:
//
// Account deactivation must use one central
// lifecycle service.
//
// The previous implementation only changed
// User.isActive and did not revoke sessions.
//
// Keep this legacy endpoint unavailable until
// the shared lifecycle service is complete.
// ==================================================
export const deactivateProfile = (role) =>
  asyncHandler(async (req, res) => {
    const profile = await findProfile(
      role,
      req.params.id
    );

    const user = await findLinkedUser(
      role,
      profile.userId
    );

    const result =
      await deactivateUserLifecycle({
        userId: user._id,
        actor: req.user,
        reason: req.body?.reason,
        req,
      });

    return res.status(200).json({
      success: true,
      message:
        result.reconciliationRequired
          ? "Account disabled. Session reconciliation is still required."
          : "Account deactivated successfully.",
      data: result,
    });
  });