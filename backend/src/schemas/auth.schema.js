import { z } from "zod";

// ==================================================
// REUSABLE PASSWORD SCHEMA
// ==================================================

const passwordSchema = z
  .string()
  .min(
    8,
    "Password must be at least 8 characters.",
  )
  .max(
    128,
    "Password is too long.",
  );





// ==================================================
// FORGOT PASSWORD SCHEMA
// ==================================================

export const forgotPasswordSchema =
  z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(
        "Invalid email address.",
      )
      .max(
        320,
        "Email is too long.",
      ),
  });

// ==================================================
// VERIFY FORGOT PASSWORD OTP SCHEMA
// ==================================================

export const verifyForgotPasswordOtpSchema =
  z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(
        "Invalid email address.",
      ),

    otp: z
      .string()
      .trim()
      .regex(
        /^\d{6}$/,
        "OTP must contain 6 digits.",
      ),
  });

// ==================================================
// RESET PASSWORD SCHEMA
// ==================================================

export const resetPasswordSchema =
  z.object({
    resetToken: z
      .string()
      .trim()
      .min(
        1,
        "Reset token is required.",
      ),

    newPassword: passwordSchema,
  });