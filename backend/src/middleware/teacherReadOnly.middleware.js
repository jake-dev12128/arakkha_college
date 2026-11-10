
import { requireRole } from "./authorization.middleware.js";

const READ_ROLES = [
  "super_admin",
  "admin",
  "teacher",
];

const WRITE_ROLES = [
  "super_admin",
  "admin",
];

/**
 * Teachers can read CMS management resources.
 *
 * Only admins and super admins may mutate data.
 *
 * Must run AFTER requireAuthentication.
 */
export const requireCmsPermission = (req, res, next) => {
  const isReadRequest =
    req.method === "GET" ||
    req.method === "HEAD";

  const allowedRoles = isReadRequest
    ? READ_ROLES
    : WRITE_ROLES;

  return requireRole(...allowedRoles)(
    req,
    res,
    next
  );
};
