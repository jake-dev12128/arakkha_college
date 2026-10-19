
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

// ==================================================
// ROLE CONFIGURATION
// ==================================================

const MANAGED_ROLES = new Set([
  "super_admin",
  "admin",
  "teacher",
  "student",
]);

const CREATION_PERMISSIONS = {
  super_admin: [
    "super_admin",
    "admin",
    "teacher",
    "student",
  ],
  admin: [
    "admin",
    "teacher",
    "student",
  ],
  teacher: ["student"],
  student: [],
};

// ==================================================
// USER LOOKUP
// ==================================================

export const findUserByEmail = async (email) => {
  if (
    typeof email !== "string" ||
    !email.trim()
  ) {
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

  const counter =
    await StudentIdCounter.findOneAndUpdate(
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
      }
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

    result =
      await StudentIdCounter.findOneAndUpdate(
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
        }
      );
  }

  if (!result) {
    throw new AppError(
      "Student ID sequence is exhausted.",
      409,
      "STUDENT_ID_SEQUENCE_EXHAUSTED"
    );
  }

  return `ACC${year}${String(
    result.sequence
  ).padStart(4, "0")}`;
};

// ==================================================
// INPUT VALIDATION HELPERS
// ==================================================

const validateActor = (actor, role) => {
  if (
    !actor ||
    !actor.isActive ||
    !CREATION_PERMISSIONS[
      actor.role
    ]?.includes(role)
  ) {
    throw new AppError(
      "You are not allowed to create this role.",
      403,
      "ROLE_CREATION_FORBIDDEN"
    );
  }
};

const normalizeInput = (input) => {
  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new AppError(
      "Invalid account data.",
      400,
      "INVALID_ACCOUNT_DATA"
    );
  }

  const {
    firstName,
    lastName,
    email,
    password,
    role,
  } = input;

  if (!MANAGED_ROLES.has(role)) {
    throw new AppError(
      "Invalid role.",
      400,
      "INVALID_ROLE"
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
      "INVALID_ACCOUNT_DATA"
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

const buildProfileData = (
  input,
  userId
) => ({
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

const compensateClerkCreation = async (
  clerkUserId
) => {
  if (!clerkUserId) {
    return true;
  }

  try {
    await clerkClient.users.deleteUser(
      clerkUserId
    );

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

export const createManagedUser = async ({
  input,
  actor,
}) => {
  const data = normalizeInput(input);

  validateActor(actor, data.role);

  const existing = await User.exists({
    email: data.email,
  });

  if (existing) {
    throw new AppError(
      "An account with this email already exists.",
      409,
      "USER_ALREADY_EXISTS"
    );
  }

  // ==================================================
  // GENERATE STUDENT ID
  // ==================================================

  const studentId =
    data.role === "student"
      ? await generateStudentId()
      : undefined;

  // Clerk usernames must be unique.
  // Student usernames use the student ID.

  const clerkUsername = studentId
    ? studentId.toLowerCase()
    : `acc_${data.role}_${randomUUID()
        .replaceAll("-", "")
        .slice(0, 16)}`;

  let clerkUser = null;
  let transactionCommitted = false;

  // ==================================================
  // STEP 1 — CREATE CLERK IDENTITY
  // ==================================================

  try {
    clerkUser =
      await clerkClient.users.createUser({
        emailAddress: [
          data.email,
        ],

        username: clerkUsername,

        firstName: data.firstName,
        lastName: data.lastName,

        password: data.password,

        publicMetadata: {
          role: data.role,

          ...(studentId
            ? { studentId }
            : {}),
        },
      });
  } catch (error) {
    if (
      error?.status === 422
    ) {
      throw new AppError(
        "Clerk rejected the account information. Check email, username and password requirements.",
        422,
        "CLERK_ACCOUNT_VALIDATION_FAILED"
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

  const session =
    await mongoose.startSession();

  try {
    await session.withTransaction(
      async () => {
        // ------------------------------------------
        // CREATE APPLICATION USER
        // ------------------------------------------

        const [user] =
          await User.create(
            [
              {
                clerkId: clerkUser.id,

                firstName:
                  data.firstName,

                lastName:
                  data.lastName,

                email:
                  data.email,

                role:
                  data.role,

                ...(studentId
                  ? { studentId }
                  : {}),

                isActive: true,
              },
            ],
            { session }
          );

        createdUser = user;

        // ------------------------------------------
        // CREATE STUDENT / TEACHER PROFILE
        // ------------------------------------------

        if (
          data.role === "student"
        ) {
          const [profile] =
            await Student.create(
              [
                {
                  ...buildProfileData(
                    data,
                    user._id
                  ),

                  studentId,

                  matriculationScores:
                    data.matriculationScores ??
                    [],
                },
              ],
              { session }
            );

          createdProfile = profile;
        }

        if (
          data.role === "teacher"
        ) {
          const [profile] =
            await Teacher.create(
              [
                buildProfileData(
                  data,
                  user._id
                ),
              ],
              { session }
            );

          createdProfile = profile;
        }

        // ------------------------------------------
        // INITIALIZE LIFECYCLE
        // ------------------------------------------

        await UserLifecycle.create(
          [
            buildLifecycleData(
              user._id
            ),
          ],
          { session }
        );
      }
    );

    transactionCommitted = true;
  } catch (error) {
    // ==================================================
    // COMPENSATE CLERK CREATION
    // ==================================================
    //
    // MongoDB transaction failed.
    // Attempt to remove the Clerk identity.
    // ==================================================

    const clerkCleaned =
      await compensateClerkCreation(
        clerkUser.id
      );

    if (!clerkCleaned) {
      throw new AppError(
        "Account creation requires manual reconciliation. Clerk identity cleanup failed.",
        503,
        "ACCOUNT_RECONCILIATION_REQUIRED"
      );
    }

    if (error?.code === 11000) {
      throw new AppError(
        "Email, student ID or profile already exists.",
        409,
        "DUPLICATE_USER_FIELD"
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

  if (
    !transactionCommitted ||
    !createdUser
  ) {
    throw new AppError(
      "Account creation could not be confirmed.",
      503,
      "ACCOUNT_CREATION_UNCONFIRMED"
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

    clerkId:
      createdUser.clerkId,

    firstName:
      createdUser.firstName,

    lastName:
      createdUser.lastName,

    email:
      createdUser.email,

    role:
      createdUser.role,

    ...(studentId
      ? { studentId }
      : {}),

    ...(createdProfile
      ? {
          profileId:
            createdProfile._id,
        }
      : {}),

    isActive:
      createdUser.isActive,

    createdAt:
      createdUser.createdAt,
  };
};
