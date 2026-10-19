
import { asyncHandler } from "../utils/asyncHandler.js";
import { createManagedUser } from "../services/user.service.js";

export const createManagedUserController = asyncHandler(
  async (req, res) => {
    const user = await createManagedUser({
      input: req.body,
      actor: req.user,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: { user },
    });
  },
);
