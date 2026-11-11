import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import User from "../models/user.model.js";
import Student from "../models/student.model.js";
import Teacher from "../models/teacher.model.js";
import StudentIdCounter from "../models/studentIdCounter.model.js";

import UserLifecycle, {
  USER_LIFECYCLE_STATUS as LIFECYCLE_STATUS,
} from "../models/userLifecycle.model.js";

import { clerkClient } from "../config/clerk.js";
import AppError from "../utils/AppError.js";
import MediaAsset from "../models/mediaAsset.model.js";

// ==================================================
// ROLE CONFIGURATION
// ==================================================


// ==================================================
// ROLE CONFIGURATION
// ==================================================

// User Management accepts only administrative roles.
const MANAGED_ROLES = new Set([
  "super_admin",
  "admin",
]);

const ACADEMIC_ROLES = new Set(["teacher", "student"]);

// Permissions for the User Management
// Create Account workflow only.
const CREATION_PERMISSIONS = {
  super_admin: ["super_admin", "admin", "teacher", "student"],

  admin: ["admin", "teacher", "student"],

  teacher: ["student"],
  student: [],
};

// ==================================================
// USER LOOKUP
// ==================================================

export const findUserByEmail = async (email) => {
  if (typeof email !== "string" || !email.trim()) {
    return null;
  }

  return User.findOne({
    email: email.trim().toLowerCase(),
  });
};

export const findUserByClerkId = async (clerkId) => {
  return User.findOne({ clerkId });
};

// ==================================================
// STUDENT ID GENERATION
// ==================================================
//
// Counter updates are atomic.
//
// Gaps in student ID sequences are acceptable.
// Do not reuse IDs after failed creations.
// ==================================================

export const generateStudentId = async () => {
  const year = new Date().getFullYear();

  const counterKey = `student:${year}`;

  const counter = await StudentIdCounter.findOneAndUpdate(
    {
      _id: counterKey,
      sequence: {
        $lt: 9999,
      },
    },
    {
      $inc: {
        sequence: 1,
      },
    },
    {
      new: true,
      upsert: false,
    },
  );

  let result = counter;

  // Initialize the yearly counter if absent.
  // Duplicate initialization is handled by
  // reading the winning document.

  if (!result) {
    try {
      await StudentIdCounter.create({
        _id: counterKey,
        sequence: 0,
      });
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }
    }

    result = await StudentIdCounter.findOneAndUpdate(
      {
        _id: counterKey,
        sequence: {
          $lt: 9999,
        },
      },
      {
        $inc: {
          sequence: 1,
        },
      },
      {
        new: true,
      },
    );
  }

  if (!result) {
    throw new AppError(
      "Student ID sequence is exhausted.",
      409,
      "STUDENT_ID_SEQUENCE_EXHAUSTED",
    );
  }

  return `ACC${year}${String(result.sequence).padStart(4, "0")}`;
};

// ==================================================
// INPUT VALIDATION HELPERS
// ==================================================

const validateActor = (actor, role) => {
  if (
    !actor ||
    !actor.isActive ||
    !CREATION_PERMISSIONS[actor.role]?.includes(role)
  ) {
    throw new AppError(
      "You are not allowed to create this role.",
      403,
      "ROLE_CREATION_FORBIDDEN",
    );
  }
};


const normalizeInput = (input, allowedRoles = MANAGED_ROLES) => {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new AppError(
      "Invalid account data.",
      400,
      "INVALID_ACCOUNT_DATA",
    );
  }

  const {
    firstName,
    lastName,
    email,
    password,
    role,
  } = input;

  // Reject teacher/student creation through
  // the User Management endpoint.
  if (!allowedRoles.has(role)) {
    throw new AppError(
      "This account role is not allowed on this endpoint.",
      400,
      "INVALID_MANAGED_USER_ROLE",
    );
  }

  if (
    typeof firstName !== "string" ||
    !firstName.trim() ||
    typeof lastName !== "string" ||
    !lastName.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string"
  ) {
    throw new AppError(
      "Required account fields are missing.",
      400,
      "INVALID_ACCOUNT_DATA",
    );
  }

  return {
    ...input,

    firstName: firstName.trim(),

    lastName: lastName.trim(),

    email: email.trim().toLowerCase(),
  };
};

// ==================================================
// PROFILE DATA
// ==================================================

const buildProfileData = (input, userId) => ({
  userId,

  firstName: input.firstName,
  lastName: input.lastName,
  email: input.email,

  address: input.address,
  currentAddress: input.currentAddress,
  age: input.age,
  fatherName: input.fatherName,
  motherName: input.motherName,
  nationalId: input.nationalId,
  dateOfBirth: input.dateOfBirth,
  gender: input.gender,
});

// ==================================================
// LIFECYCLE INITIAL STATE
// ==================================================

const buildLifecycleData = (userId) => ({
  userId,

  status: LIFECYCLE_STATUS.ACTIVE,

  operation: null,
  operationId: null,

  requestedBy: null,
  reason: null,

  reconciliationRequired: false,
  reconciliationAttempts: 0,

  requestedAt: null,
  completedAt: null,

  lastReconciliationAt: null,
  reconciledAt: null,

  deactivatedAt: null,
  reactivatedAt: null,
});

// ==================================================
// CLERK COMPENSATION
// ==================================================

const compensateClerkCreation = async (clerkUserId) => {
  if (!clerkUserId) {
    return true;
  }

  try {
    await clerkClient.users.deleteUser(clerkUserId);

    return true;
  } catch {
    // Do not expose provider error details
    // or sensitive data in the API response.

    return false;
  }
};

// ==================================================
// CREATE MANAGED USER
// ==================================================

export const createManagedUser = async ({ input, actor, allowedRoles = MANAGED_ROLES }) => {
  const data = normalizeInput(input, allowedRoles);

  validateActor(actor, data.role);

  const existing = await User.exists({
    email: data.email,
  });

  if (existing) {
    throw new AppError(
      "An account with this email already exists.",
      409,
      "USER_ALREADY_EXISTS",
    );
  }

  // ==================================================
  // GENERATE STUDENT ID
  // ==================================================

  const studentId =
    data.role === "student" ? await generateStudentId() : undefined;

  // Clerk usernames must be unique.
  // Student usernames use the student ID.

  const clerkUsername = studentId
    ? studentId.toLowerCase()
    : `acc_${data.role}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;

  let clerkUser = null;
  let transactionCommitted = false;

  // ==================================================
  // STEP 1 — CREATE CLERK IDENTITY
  // ==================================================

  try {
    clerkUser = await clerkClient.users.createUser({
      emailAddress: [data.email],

      username: clerkUsername,

      firstName: data.firstName,
      lastName: data.lastName,

      password: data.password,

      publicMetadata: {
        role: data.role,

        ...(studentId ? { studentId } : {}),
      },
    });
  } catch (error) {
    if (error?.status === 422) {
      throw new AppError(
        "Clerk rejected the account information. Check email, username and password requirements.",
        422,
        "CLERK_ACCOUNT_VALIDATION_FAILED",
      );
    }

    throw error;
  }

  // ==================================================
  // STEP 2 — MONGODB TRANSACTION
  // ==================================================
  //
  // The MongoDB deployment must support
  // transactions (replica set or sharded cluster).
  //
  // All User/Profile/Lifecycle writes are
  // committed together.
  // ==================================================

  let createdUser = null;
  let createdProfile = null;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // ------------------------------------------
      // CREATE APPLICATION USER
      // ------------------------------------------

      const [user] = await User.create(
        [
          {
            clerkId: clerkUser.id,

            firstName: data.firstName,

            lastName: data.lastName,

            email: data.email,

            role: data.role,

            ...(studentId ? { studentId } : {}),

            isActive: true,
          },
        ],
        { session },
      );

      createdUser = user;

      // ------------------------------------------
      // CREATE STUDENT / TEACHER PROFILE
      // ------------------------------------------

      if (data.role === "student") {
        const [profile] = await Student.create(
          [
            {
              ...buildProfileData(data, user._id),

              studentId,

              matriculationScores: data.matriculationScores ?? [],
            },
          ],
          { session },
        );

        createdProfile = profile;
      }

      if (data.role === "teacher") {
        const [profile] = await Teacher.create(
          [buildProfileData(data, user._id)],
          { session },
        );

        createdProfile = profile;
      }

      // ------------------------------------------
      // INITIALIZE LIFECYCLE
      // ------------------------------------------

      await UserLifecycle.create([buildLifecycleData(user._id)], { session });
    });

    transactionCommitted = true;
  } catch (error) {
    // ==================================================
    // COMPENSATE CLERK CREATION
    // ==================================================
    //
    // MongoDB transaction failed.
    // Attempt to remove the Clerk identity.
    // ==================================================

    const clerkCleaned = await compensateClerkCreation(clerkUser.id);

    if (!clerkCleaned) {
      throw new AppError(
        "Account creation requires manual reconciliation. Clerk identity cleanup failed.",
        503,
        "ACCOUNT_RECONCILIATION_REQUIRED",
      );
    }

    if (error?.code === 11000) {
      throw new AppError(
        "Email, student ID or profile already exists.",
        409,
        "DUPLICATE_USER_FIELD",
      );
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw error;
  } finally {
    await session.endSession();
  }

  // ==================================================
  // STEP 3 — VERIFY TRANSACTION RESULT
  // ==================================================

  if (!transactionCommitted || !createdUser) {
    throw new AppError(
      "Account creation could not be confirmed.",
      503,
      "ACCOUNT_CREATION_UNCONFIRMED",
    );
  }

  // ==================================================
  // RESPONSE
  // ==================================================
  //
  // Never return passwords or sensitive
  // personal profile fields.
  // ==================================================

  return {
    id: createdUser._id,

    clerkId: createdUser.clerkId,

    firstName: createdUser.firstName,

    lastName: createdUser.lastName,

    email: createdUser.email,

    role: createdUser.role,

    ...(studentId ? { studentId } : {}),

    ...(createdProfile
      ? {
          profileId: createdProfile._id,
        }
      : {}),

    isActive: createdUser.isActive,

    createdAt: createdUser.createdAt,
  };
};

export const createAcademicAccount = async ({ input, actor }) => {
  return createManagedUser({ input, actor, allowedRoles: ACADEMIC_ROLES });
};

const profileImageError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

// ==================================================
// SELF PROFILE IMAGE
// ==================================================

export const updateMyProfileImage = async ({ userId, mediaId }) => {
  if (!mongoose.isObjectIdOrHexString(mediaId)) {
    throw profileImageError("Invalid media ID.");
  }

  let previousMediaId = null;
  let updatedUser = null;

  await mongoose.connection.transaction(async (session) => {
    const user = await User.findById(userId).session(session);

    if (!user || !user.isActive) {
      throw profileImageError("Active user not found.", 404);
    }

    const media = await MediaAsset.findById(mediaId).session(session);

    if (!media) {
      throw profileImageError("Image not found.", 404);
    }

    if (media.category !== "users" || media.resourceType !== "image") {
      throw profileImageError("Invalid profile image.");
    }

    if (String(media.uploadedBy) !== String(user._id)) {
      throw profileImageError("You do not own this image.", 403);
    }

    const sameImage =
      String(user.profileImageMediaId || "") === String(media._id);

    if (sameImage) {
      if (
        media.status !== "attached" ||
        media.attachedTo?.model !== "User" ||
        String(media.attachedTo?.documentId) !== String(user._id) ||
        media.cleanupRequestedAt ||
        media.cleanupLockedAt ||
        user.profileImage !== media.secureUrl
      ) {
        throw profileImageError("Profile image state is inconsistent.", 409);
      }

      updatedUser = user.toObject();
      return;
    }

    if (media.status !== "pending") {
      throw profileImageError("Image is not available for attachment.", 409);
    }

    if (
      media.cleanupRequestedAt ||
      media.cleanupLockedAt ||
      media.attachedTo?.documentId
    ) {
      throw profileImageError("Image is not available for attachment.", 409);
    }

    const attached = await MediaAsset.updateOne(
      {
        _id: media._id,
        uploadedBy: user._id,
        category: "users",
        resourceType: "image",
        status: "pending",
        cleanupRequestedAt: null,
        cleanupLockedAt: null,
        $or: [
          { attachedTo: { $exists: false } },
          { "attachedTo.documentId": null },
        ],
      },
      {
        $set: {
          status: "attached",
          attachedTo: {
            model: "User",
            documentId: user._id,
          },
          cleanupRequestedAt: null,
          cleanupNextRetryAt: null,
          cleanupAttempts: 0,
          cleanupLastError: null,
          cleanupLockedAt: null,
        },
      },
      { session },
    );

    if (attached.matchedCount !== 1) {
      throw profileImageError("Image attachment conflict.", 409);
    }

    previousMediaId = user.profileImageMediaId || null;

    user.profileImage = media.secureUrl;
    user.profileImageMediaId = media._id;

    await user.save({ session });

    if (previousMediaId) {
      const detached = await MediaAsset.updateOne(
        {
          _id: previousMediaId,
          category: "users",
          resourceType: "image",
          status: "attached",
          cleanupRequestedAt: null,
          cleanupLockedAt: null,
          "attachedTo.model": "User",
          "attachedTo.documentId": user._id,
        },
        {
          $set: {
            status: "pending",
            cleanupRequestedAt: new Date(),
            cleanupNextRetryAt: new Date(),
            cleanupAttempts: 0,
            cleanupLastError: null,
            cleanupLockedAt: null,
          },
          $unset: {
            attachedTo: "",
          },
        },
        { session },
      );

      if (detached.matchedCount !== 1) {
        throw profileImageError("Previous image detachment failed.", 409);
      }
    }

    updatedUser = user.toObject();
  });

  return {
    user: {
      _id: updatedUser._id,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage,
      profileImageMediaId: updatedUser.profileImageMediaId,
    },
    previousMediaId,
  };
};

// ==================================================
// ADMIN MANAGED PROFILE IMAGE
// ==================================================

export const updateManagedProfileImage = async ({
  actor,
  userId,
  mediaId,
}) => {
  const allowedRoles = ["super_admin", "admin"];

  if (
    !actor?._id ||
    !actor.isActive ||
    !allowedRoles.includes(actor.role)
  ) {
    throw new AppError(
      "You are not authorized to manage profile images.",
      403,
      "PROFILE_IMAGE_FORBIDDEN"
    );
  }

  if (!mongoose.isObjectIdOrHexString(userId)) {
    throw new AppError(
      "Invalid user ID.",
      400,
      "INVALID_USER_ID"
    );
  }

  if (
    mediaId !== null &&
    !mongoose.isObjectIdOrHexString(mediaId)
  ) {
    throw new AppError(
      "mediaId must be a valid ID or null.",
      400,
      "INVALID_MEDIA_ID"
    );
  }

  let updatedUser = null;
  let previousMediaId = null;

  await mongoose.connection.transaction(async (session) => {
    const activeActor = await User.findOne({
      _id: actor._id,
      role: { $in: allowedRoles },
      isActive: true,
    }).session(session);

    if (!activeActor) {
      throw new AppError(
        "You are not authorized to manage profile images.",
        403,
        "PROFILE_IMAGE_FORBIDDEN"
      );
    }

    const user = await User.findOne({
      _id: userId,
      role: { $in: ["student", "teacher"] },
      isActive: true,
    }).session(session);

    if (!user) {
      throw new AppError(
        "Active student or teacher not found.",
        404,
        "MANAGED_USER_NOT_FOUND"
      );
    }

    previousMediaId = user.profileImageMediaId || null;

    if (mediaId === null && !previousMediaId) {
      if (user.profileImage) {
        throw new AppError(
          "Existing image reference is inconsistent.",
          409,
          "PROFILE_IMAGE_STATE_CONFLICT"
        );
      }

      updatedUser = user.toObject();
      return;
    }

    let newMedia = null;

    if (mediaId !== null) {
      newMedia = await MediaAsset.findById(mediaId)
        .session(session);

      if (
        !newMedia ||
        newMedia.category !== "users" ||
        newMedia.resourceType !== "image"
      ) {
        throw new AppError(
          "Valid profile image not found.",
          404,
          "PROFILE_IMAGE_NOT_FOUND"
        );
      }

      if (
        String(newMedia.uploadedBy) !==
        String(actor._id)
      ) {
        throw new AppError(
          "You do not own this uploaded image.",
          403,
          "PROFILE_IMAGE_OWNERSHIP_FORBIDDEN"
        );
      }

      if (
        String(previousMediaId || "") ===
        String(newMedia._id)
      ) {
        if (
          newMedia.status !== "attached" ||
          newMedia.attachedTo?.model !== "User" ||
          String(newMedia.attachedTo?.documentId) !==
            String(user._id) ||
          user.profileImage !== newMedia.secureUrl ||
          newMedia.cleanupRequestedAt ||
          newMedia.cleanupLockedAt
        ) {
          throw new AppError(
            "Profile image state is inconsistent.",
            409,
            "PROFILE_IMAGE_STATE_CONFLICT"
          );
        }

        updatedUser = user.toObject();
        return;
      }

      if (
        newMedia.status !== "pending" ||
        newMedia.cleanupRequestedAt ||
        newMedia.cleanupLockedAt ||
        newMedia.attachedTo?.documentId
      ) {
        throw new AppError(
          "Image is unavailable for attachment.",
          409,
          "PROFILE_IMAGE_UNAVAILABLE"
        );
      }
    }

    if (!previousMediaId && user.profileImage) {
      throw new AppError(
        "Existing profile image has no media reference.",
        409,
        "PROFILE_IMAGE_STATE_CONFLICT"
      );
    }

    if (newMedia) {
      const attachment = await MediaAsset.updateOne(
        {
          _id: newMedia._id,
          uploadedBy: activeActor._id,
          category: "users",
          resourceType: "image",
          status: "pending",
          cleanupRequestedAt: null,
          cleanupLockedAt: null,
          $or: [
            { attachedTo: { $exists: false } },
            { "attachedTo.documentId": null },
          ],
        },
        {
          $set: {
            status: "attached",
            attachedTo: {
              model: "User",
              documentId: user._id,
            },
            cleanupRequestedAt: null,
            cleanupNextRetryAt: null,
            cleanupAttempts: 0,
            cleanupLastError: null,
            cleanupLockedAt: null,
          },
        },
        { session }
      );

      if (attachment.matchedCount !== 1) {
        throw new AppError(
          "Image attachment conflict.",
          409,
          "PROFILE_IMAGE_ATTACHMENT_CONFLICT"
        );
      }
    }

    user.profileImage = newMedia?.secureUrl ?? null;
    user.profileImageMediaId = newMedia?._id ?? null;

    await user.save({ session });

    if (previousMediaId) {
      const detached = await MediaAsset.updateOne(
        {
          _id: previousMediaId,
          category: "users",
          resourceType: "image",
          status: "attached",
          cleanupRequestedAt: null,
          cleanupLockedAt: null,
          "attachedTo.model": "User",
          "attachedTo.documentId": user._id,
        },
        {
          $set: {
            status: "pending",
            cleanupRequestedAt: new Date(),
            cleanupNextRetryAt: new Date(),
            cleanupAttempts: 0,
            cleanupLastError: null,
            cleanupLockedAt: null,
          },
          $unset: {
            attachedTo: "",
          },
        },
        { session }
      );

      if (detached.matchedCount !== 1) {
        throw new AppError(
          "Previous image detachment failed.",
          409,
          "PROFILE_IMAGE_DETACHMENT_CONFLICT"
        );
      }
    }

    updatedUser = user.toObject();
  });

  return {
    user: {
      _id: updatedUser._id,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage,
      profileImageMediaId:
        updatedUser.profileImageMediaId,
    },
    previousMediaId,
  };
};