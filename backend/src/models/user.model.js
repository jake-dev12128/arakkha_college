
import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    // Clerk authentication identity
    clerkId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Basic profile
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      maxlength: 320,
    },

    // Application authorization role.
    // The backend must control role assignment.
    role: {
      type: String,
      enum: [
        "super_admin",
        "admin",
        "teacher",
        "student",
      ],
      default: "student",
      required: true,
    },

    // Backend-generated student ID.
    // Example: ACC20260001
    studentId: {
      type: String,
      trim: true,
      uppercase: true,
      match: /^ACC\d{8}$/,
      default: undefined,
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },


  },
  {
    timestamps: true,
    strict: true,
  },
);

// Role-based account queries
userSchema.index({
  role: 1,
  isActive: 1,
});

// Student IDs must be unique when present.
// sparse allows non-student accounts to omit studentId.
userSchema.index(
  { studentId: 1 },
  { unique: true, sparse: true },
);

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;
