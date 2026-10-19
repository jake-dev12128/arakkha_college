import { z } from "zod";

export const verifyOtpSchema = z.object({
  identifier: z.string().trim().min(1, "Identifier is required."),

  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code."),
});
