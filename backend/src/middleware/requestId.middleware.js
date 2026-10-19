import crypto from "node:crypto";

export const requestIdMiddleware = (req, res, next) => {
  const incomingRequestId = req.get("x-request-id");

  const requestId =
    incomingRequestId && /^[A-Za-z0-9._:-]{1,128}$/.test(incomingRequestId)
      ? incomingRequestId
      : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
};
