
import * as service from "../services/news.service.js";

import {
  createNewsSchema,
  updateNewsSchema,
  newsIdSchema,
  newsPublicationSchema,
} from "../schemas/news.schema.js";

const send = (res, data, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });

const validate = (schema, value) => {
  const result = schema.safeParse(value);

  if (!result.success) {
    const error = new Error("Validation failed.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.isOperational = true;
    throw error;
  }

  return result.data;
};

const getId = (req) =>
  validate(newsIdSchema, {
    id: req.params.id,
  }).id;

// PUBLIC

export const publicNewsList = async (req, res) =>
  send(res, {
    news: await service.listPublicNews(),
  });

export const publicNewsDetail = async (req, res) =>
  send(res, {
    news: await service.getPublicNews(getId(req)),
  });

// ADMIN

export const adminNewsList = async (req, res) =>
  send(res, {
    news: await service.listAdminNews(),
  });

export const adminNewsDetail = async (req, res) =>
  send(res, {
    news: await service.getAdminNews(getId(req)),
  });

export const adminCreateNews = async (req, res) => {
  const payload = validate(createNewsSchema, req.body);

  return send(res, {
    news: await service.createNews(payload),
  }, 201);
};

export const adminUpdateNews = async (req, res) => {
  const payload = validate(updateNewsSchema, req.body);

  return send(res, {
    news: await service.updateNews(
      getId(req),
      payload
    ),
  });
};

export const adminPublishNews = async (req, res) => {
  const { isPublished } = validate(
    newsPublicationSchema,
    req.body
  );

  return send(res, {
    news: await service.setNewsPublication(
      getId(req),
      isPublished
    ),
  });
};

export const adminDeleteNews = async (req, res) => {
  await service.deleteNews(getId(req));

  return send(res, {
    message: "News deleted successfully.",
  });
};
