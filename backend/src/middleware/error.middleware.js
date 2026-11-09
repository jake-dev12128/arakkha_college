import logger from "../utils/logger.js";

export const errorMiddleware = (err, req, res, next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "Maximum image size is 5 MB.",
      code: "IMAGE_TOO_LARGE",
      requestId: req.requestId,
    });
  }

  if (err?.code?.startsWith?.("LIMIT_")) {
    return res.status(400).json({
      success: false,
      message: "Invalid upload request.",
      code: "INVALID_UPLOAD_REQUEST",
      requestId: req.requestId,
    });
  }
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;

  const isOperational = err?.isOperational === true;

  logger.error("Unhandled API error", {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode,
    code: err?.code,
    error: err,
  });

  if (err?.code === 11000) {
    const duplicateFields = Object.keys(err.keyPattern || {});

    if (duplicateFields.includes("email")) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
        code: "USER_ALREADY_EXISTS",
        requestId: req.requestId,
      });
    }

    if (duplicateFields.includes("clerkId")) {
      return res.status(409).json({
        success: false,
        message: "Authentication account is already linked.",
        code: "CLERK_ACCOUNT_ALREADY_LINKED",
        requestId: req.requestId,
      });
    }

    return res.status(409).json({
      success: false,
      message: "A resource with the same unique value already exists.",
      code: "DUPLICATE_RESOURCE",
      requestId: req.requestId,
    });
  }

  const message = isOperational ? err.message : "Internal server error.";

  return res.status(statusCode).json({
    success: false,
    message,
    ...(err?.code && { code: err.code }),
    requestId: req.requestId,
  });
};
