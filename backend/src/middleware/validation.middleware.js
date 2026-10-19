
export const validate = (schema, target = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    if (target === "query") {
      res.locals.validatedQuery = result.data;
    } else if (target === "params") {
      res.locals.validatedParams = result.data;
    } else if (target === "body") {
      req.body = result.data;
    } else {
      return res.status(500).json({
        success: false,
        message: "Unsupported validation target.",
      });
    }

    return next();
  };
};
