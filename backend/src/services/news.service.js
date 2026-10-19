
import mongoose from "mongoose";
import sanitizeHtml from "sanitize-html";
import News from "../models/news.model.js";

const fail = (message, statusCode = 404) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

const validId = (id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw fail("Invalid news ID.", 400);
  }
};

const slugify = (title) =>
  title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

const sanitizeContent = (html) =>
  sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i",
      "u", "s", "h1", "h2", "h3",
      "ul", "ol", "li", "blockquote", "a",
    ],
    allowedAttributes: {
      a: ["href", "title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });

const clean = (payload) => {
  const data = { ...payload };

  if (data.content !== undefined) {
    data.content = sanitizeContent(data.content);

    const plain = sanitizeHtml(data.content, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();

    if (!plain) {
      throw fail("News content cannot be empty.", 400);
    }
  }

  return data;
};

export const listPublicNews = async () =>
  News.find({
    isPublished: true,
    isActive: true,
  })
    .select(
      "title slug summary coverImage category isFeatured publishedAt"
    )
    .sort({
      isFeatured: -1,
      publishedAt: -1,
      _id: -1,
    })
    .lean();

export const getPublicNews = async (id) => {
  validId(id);

  const news = await News.findOne({
    _id: id,
    isPublished: true,
    isActive: true,
  }).lean();

  if (!news) throw fail("News not found.");
  return news;
};

export const listAdminNews = async () =>
  News.find()
    .sort({ createdAt: -1 })
    .lean();

export const getAdminNews = async (id) => {
  validId(id);

  const news = await News.findById(id).lean();
  if (!news) throw fail("News not found.");

  return news;
};

export const createNews = async (payload) => {
  const data = clean(payload);
  const id = new mongoose.Types.ObjectId();

  const slugBase = slugify(data.title) || "news";

  return News.create({
    ...data,
    _id: id,
    slug: `${slugBase}-${id.toString().slice(-8)}`,
  });
};

export const updateNews = async (id, payload) => {
  validId(id);

  const news = await News.findById(id);
  if (!news) throw fail("News not found.");

  const data = clean(payload);

  // Keep existing slug stable after title edits.
  Object.assign(news, data);

  await news.save();
  return news;
};

export const setNewsPublication = async (
  id,
  isPublished
) => {
  validId(id);

  const news = await News.findById(id);
  if (!news) throw fail("News not found.");

  news.isPublished = isPublished;
  news.publishedAt = isPublished
    ? news.publishedAt || new Date()
    : null;

  await news.save();
  return news;
};

export const deleteNews = async (id) => {
  validId(id);

  const news = await News.findByIdAndDelete(id);
  if (!news) throw fail("News not found.");

  return news;
};
