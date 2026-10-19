
/**
 * Role-based authorization middleware.
 *
 * Requires requireAuthentication to run first,
 * because that middleware attaches req.user.
 */

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
        code: "FORBIDDEN",
      });
    }

    return next();
  };
};

// Backward-compatible alias because existing routes
// already import authorizeRoles().
export const authorizeRoles = (...allowedRoles) =>
  requireRole(...allowedRoles);
