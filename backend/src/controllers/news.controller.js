
import * as service from "../services/news.service.js";

import {
  createNewsSchema,
  updateNewsSchema,
  newsIdSchema,
  newsPublicationSchema,
} from "../schemas/news.schema.js";

import {
  toPublicImageUrl,
} from "../utils/imageDelivery.js";

// ==========================================
// RESPONSE HELPERS
// ==========================================

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

// ==========================================
// IMAGE DELIVERY RESPONSE MAPPING
// ==========================================

// Keep the original coverImage unchanged.
// Add a separate field for image display.
//
// Supports both lean MongoDB objects and
// hydrated Mongoose documents.

const mapNewsDelivery = (news) => {
  if (!news) {
    return news;
  }

  const record =
    typeof news.toObject === "function"
      ? news.toObject()
      : news;

  return {
    ...record,
    coverImageDeliveryUrl: record.coverImage
      ? toPublicImageUrl(record.coverImage)
      : null,
  };
};

const mapNewsListDelivery = (newsList) =>
  newsList.map(mapNewsDelivery);

// ==========================================
// PUBLIC NEWS
// ==========================================

export const publicNewsList = async (req, res) =>
  send(res, {
    news: mapNewsListDelivery(
      await service.listPublicNews()
    ),
  });

export const publicNewsDetail = async (req, res) =>
  send(res, {
    news: mapNewsDelivery(
      await service.getPublicNews(getId(req))
    ),
  });

// ==========================================
// ADMIN NEWS
// ==========================================

export const adminNewsList = async (req, res) =>
  send(res, {
    news: mapNewsListDelivery(
      await service.listAdminNews()
    ),
  });

export const adminNewsDetail = async (req, res) =>
  send(res, {
    news: mapNewsDelivery(
      await service.getAdminNews(getId(req))
    ),
  });

// ==========================================
// ADMIN CREATE NEWS
// ==========================================

export const adminCreateNews = async (req, res) => {
  const payload = validate(
    createNewsSchema,
    req.body
  );

  const news = await service.createNews(
    payload,
    req.user._id
  );

  return send(
    res,
    {
      news: mapNewsDelivery(news),
    },
    201
  );
};

// ==========================================
// ADMIN UPDATE NEWS
// ==========================================

export const adminUpdateNews = async (req, res) => {
  const payload = validate(
    updateNewsSchema,
    req.body
  );

  const news = await service.updateNews(
    getId(req),
    payload,
    req.user._id
  );

  return send(res, {
    news: mapNewsDelivery(news),
  });
};

// ==========================================
// ADMIN PUBLISH / UNPUBLISH NEWS
// ==========================================

export const adminPublishNews = async (req, res) => {
  const { isPublished } = validate(
    newsPublicationSchema,
    req.body
  );

  const news = await service.setNewsPublication(
    getId(req),
    isPublished
  );

  return send(res, {
    news: mapNewsDelivery(news),
  });
};

// ==========================================
// ADMIN DELETE NEWS
// ==========================================

export const adminDeleteNews = async (req, res) => {
  await service.deleteNews(getId(req));

  return send(res, {
    message: "News deleted successfully.",
  });
};
