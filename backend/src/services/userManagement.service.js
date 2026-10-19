
import User from "../models/user.model.js";
import Student from "../models/student.model.js";
import Teacher from "../models/teacher.model.js";

import { clerkClient } from "../config/clerk.js";
import AppError from "../utils/AppError.js";
import mongoose from "mongoose";
import {
  deactivateUserLifecycle,
  reactivateUserLifecycle,
} from "./userLifecycle.service.js";

// ==================================================
// CONSTANTS
// ==================================================

const PUBLIC_USER_FIELDS =
  "_id firstName lastName email role studentId isActive createdAt";

const MANAGEMENT_ROLES = new Set([
  "super_admin",
  "admin",
]);

// ==================================================
// HELPERS
// ==================================================
const NAME_FIELDS = [
  "firstName",
  "lastName",
];

const PROFILE_FIELDS = [
  "address",
  "currentAddress",
  "age",
  "fatherName",
  "motherName",
  "nationalId",
  "dateOfBirth",
  "gender",
];

const STUDENT_FIELDS = [
  ...PROFILE_FIELDS,
  "matriculationScores",
];

const pickAllowedFields = (input, allowedFields) => {
  const result = {};

  for (const field of allowedFields) {
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        field
      )
    ) {
      result[field] = input[field];
    }
  }

  return result;
};

const normalizeProfileChanges = (input, role) => {
  const allowedFields =
    role === "student"
      ? STUDENT_FIELDS
      : role === "teacher"
        ? PROFILE_FIELDS
        : [];

  const changes = pickAllowedFields(
    input,
    allowedFields
  );

  if (
    Object.prototype.hasOwnProperty.call(
      changes,
      "dateOfBirth"
    )
  ) {
    const date = new Date(changes.dateOfBirth);

    if (
      changes.dateOfBirth === null ||
      changes.dateOfBirth === "" ||
      Number.isNaN(date.getTime())
    ) {
      throw new AppError(
        "Invalid date of birth.",
        400,
        "INVALID_DATE_OF_BIRTH"
      );
    }

    changes.dateOfBirth = date;
  }

  return changes;
};
const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toPublicUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  studentId: user.studentId,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

const assertManagementPermission = (
  actor,
  target,
  operation
) => {
  if (!actor || !MANAGEMENT_ROLES.has(actor.role)) {
    throw new AppError(
      "You are not allowed to manage users.",
      403,
      "USER_MANAGEMENT_FORBIDDEN"
    );
  }

  if (
    String(actor._id) === String(target._id) &&
    operation !== "update"
  ) {
    throw new AppError(
      "You cannot deactivate or delete your own account.",
      403,
      "SELF_ACCOUNT_OPERATION_FORBIDDEN"
    );
  }

  if (
    target.role === "super_admin" &&
    actor.role !== "super_admin"
  ) {
    throw new AppError(
      "Only a super admin can manage super admin accounts.",
      403,
      "SUPER_ADMIN_MANAGEMENT_FORBIDDEN"
    );
  }

  if (
    operation === "delete" &&
    actor.role !== "super_admin"
  ) {
    throw new AppError(
      "Permanent deletion requires super admin permission.",
      403,
      "PERMANENT_DELETE_FORBIDDEN"
    );
  }
};

const findTargetUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(
      "User not found.",
      404,
      "USER_NOT_FOUND"
    );
  }

  return user;
};

const ensureAnotherActiveSuperAdmin = async (
  target
) => {
  if (target.role !== "super_admin") {
    return;
  }

  const count = await User.countDocuments({
    role: "super_admin",
    isActive: true,
    _id: { $ne: target._id },
  });

  if (count === 0) {
    throw new AppError(
      "The last active super admin cannot be deactivated or deleted.",
      409,
      "LAST_SUPER_ADMIN_PROTECTED"
    );
  }
};

// ==================================================
// LIST MANAGED USERS
// ==================================================

export const listManagedUsers = async ({
  role,
  search,
  page = 1,
  limit = 10,
}) => {
  const filter = {};

  if (role) {
    filter.role = role;
  }

  if (search) {
    const pattern = new RegExp(
      escapeRegExp(search),
      "i"
    );

    filter.$or = [
      { firstName: pattern },
      { lastName: pattern },
      { email: pattern },
      { studentId: pattern },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(PUBLIC_USER_FIELDS)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ==================================================
// ADMIN DASHBOARD STATISTICS
// ==================================================

export const getAdminDashboardStats = async () => {
  const [
    totalStudents,
    totalTeachers,
    totalAdmins,
    totalSuperAdmins,
    activeUsers,
    inactiveUsers,
  ] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "teacher" }),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ role: "super_admin" }),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: false }),
  ]);

  return {
    totalStudents,
    totalTeachers,
    totalAdmins,
    totalSuperAdmins,
    totalUsers:
      totalStudents +
      totalTeachers +
      totalAdmins +
      totalSuperAdmins,
    activeUsers,
    inactiveUsers,
  };
};

// ==================================================
// GET MANAGED USER
// ==================================================

export const getManagedUser = async ({
  userId,
  actor,
}) => {
  const user = await findTargetUser(userId);

  assertManagementPermission(
    actor,
    user,
    "read"
  );

  return toPublicUser(user);
};

// ==================================================
// UPDATE MANAGED USER
// ==================================================


export const updateManagedUser = async ({
  userId,
  actor,
  input,
}) => {
  const user = await findTargetUser(userId);

  assertManagementPermission(
    actor,
    user,
    "update"
  );

  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new AppError(
      "Invalid update data.",
      400,
      "INVALID_UPDATE_DATA"
    );
  }

  const allowedFields = [
    ...NAME_FIELDS,
    ...(user.role === "student"
      ? STUDENT_FIELDS
      : user.role === "teacher"
        ? PROFILE_FIELDS
        : []),
  ];

  const unsupported = Object.keys(input).filter(
    (field) => !allowedFields.includes(field)
  );

  if (unsupported.length > 0) {
    throw new AppError(
      "One or more update fields are not allowed.",
      400,
      "UPDATE_FIELDS_FORBIDDEN"
    );
  }

  const nameChanges = pickAllowedFields(
    input,
    NAME_FIELDS
  );

  const profileChanges =
    normalizeProfileChanges(input, user.role);

  if (
    Object.keys(nameChanges).length === 0 &&
    Object.keys(profileChanges).length === 0
  ) {
    throw new AppError(
      "No update fields provided.",
      400,
      "EMPTY_USER_UPDATE"
    );
  }

  // Validate name values before calling Clerk.
  for (const field of NAME_FIELDS) {
    if (
      Object.prototype.hasOwnProperty.call(
        nameChanges,
        field
      )
    ) {
      const value = nameChanges[field];

      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.trim().length > 100
      ) {
        throw new AppError(
          `Invalid ${field}.`,
          400,
          "INVALID_NAME"
        );
      }

      nameChanges[field] = value.trim();
    }
  }

  const previousNames = {
    firstName: user.firstName,
    lastName: user.lastName,
  };

  let clerkUpdated = false;

  // Only name changes need Clerk synchronization.
  if (Object.keys(nameChanges).length > 0) {
    try {
      await clerkClient.users.updateUser(
        user.clerkId,
        nameChanges
      );

      clerkUpdated = true;
    } catch (error) {
      console.error("Clerk identity update failed:", {
        status: error?.status,
        code: error?.code,
        errors: error?.errors?.map((item) => ({
          code: item.code,
          message: item.message,
        })),
      });

      throw new AppError(
        error?.status === 404
          ? "Clerk identity not found."
          : "Unable to update Clerk identity.",
        error?.status === 404 ? 409 : 502,
        "CLERK_IDENTITY_UPDATE_FAILED"
      );
    }
  }

  try {
    await mongoose.connection.transaction(
      async (session) => {
        if (Object.keys(nameChanges).length > 0) {
          const userResult = await User.updateOne(
            { _id: user._id },
            { $set: nameChanges },
            {
              session,
              runValidators: true,
            }
          );

          if (userResult.matchedCount !== 1) {
            throw new Error(
              "User disappeared during update."
            );
          }
        }

        if (
          user.role === "student" ||
          user.role === "teacher"
        ) {
          const ProfileModel =
            user.role === "student"
              ? Student
              : Teacher;

          const combinedChanges = {
            ...nameChanges,
            ...profileChanges,
          };

          if (
            Object.keys(combinedChanges).length > 0
          ) {
            const profileResult =
              await ProfileModel.updateOne(
                { userId: user._id },
                { $set: combinedChanges },
                {
                  session,
                  runValidators: true,
                }
              );

            if (
              profileResult.matchedCount !== 1
            ) {
              throw new Error(
                "User profile not found."
              );
            }
          }
        }
      }
    );
  } catch (error) {
    // Best-effort Clerk compensation.
    if (clerkUpdated) {
      try {
        await clerkClient.users.updateUser(
          user.clerkId,
          previousNames
        );
      } catch {
        throw new AppError(
          "Identity synchronization requires reconciliation.",
          503,
          "IDENTITY_RECONCILIATION_REQUIRED"
        );
      }
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Unable to update user profile.",
      500,
      "USER_UPDATE_FAILED"
    );
  }

  const updated = await findTargetUser(userId);

  return toPublicUser(updated);
};


// ==================================================
// DEACTIVATE MANAGED USER
// ==================================================

export const deactivateManagedUser = async ({
  userId,
  actor,
  reason,
  req,
}) => {
  const user = await findTargetUser(userId);

  assertManagementPermission(
    actor,
    user,
    "deactivate"
  );

  await ensureAnotherActiveSuperAdmin(user);

  // All account lifecycle mutations must
  // be handled by the lifecycle service.
  return deactivateUserLifecycle({
    userId: String(user._id),
    actor,
    reason,
    req,
  });
};

// ==================================================
// REACTIVATE MANAGED USER
// ==================================================

export const reactivateManagedUser = async ({
  userId,
  actor,
  reason,
}) => {
  const user = await findTargetUser(userId);

  assertManagementPermission(
    actor,
    user,
    "reactivate"
  );

  // Do not directly set User.isActive = true.
  // The lifecycle service must verify
  // reconciliation requirements first.
  return reactivateUserLifecycle({
    userId: String(user._id),
    actor,
    reason,
  });
};


// ==================================================
// PERMANENT DELETE — SAFE GUARD
// ==================================================

export const permanentlyDeleteManagedUser = async ({
  userId,
  actor,
  reason,
  confirmation,
}) => {
  const user = await findTargetUser(userId);

  assertManagementPermission(
    actor,
    user,
    "delete"
  );

  await ensureAnotherActiveSuperAdmin(user);

  if (confirmation !== "DELETE PERMANENTLY") {
    throw new AppError(
      "Permanent deletion confirmation is invalid.",
      400,
      "INVALID_DELETE_CONFIRMATION"
    );
  }

  // IMPORTANT:
  //
  // A production-safe permanent delete requires
  // checking all referencing collections:
  //
  // - Student / Teacher profiles
  // - Program enrollments
  // - Cohort seat accounting
  // - Course assignments
  // - Attendance
  // - Examination results
  // - Sessions and audit references
  // - Clerk identity
  //
  // Until the complete dependency graph is
  // verified, fail closed instead of deleting
  // only some of the records.

  throw new AppError(
    "Permanent deletion is blocked until academic dependencies and retention rules are verified. Deactivate this account instead.",
    409,
    "PERMANENT_DELETE_DEPENDENCIES_NOT_VERIFIED"
  );
};
