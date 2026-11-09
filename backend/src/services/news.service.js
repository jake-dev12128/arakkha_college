
import mongoose from "mongoose";
import sanitizeHtml from "sanitize-html";

import News from "../models/news.model.js";
import {
  deleteDetachedNewsImage,
} from "./mediaCleanup.service.js";
import {
  validateNewsMedia,
  attachNewsMedia,
  detachNewsMedia,
} from "./newsMedia.service.js";

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
    allowedSchemes: [
      "http", "https", "mailto",
    ],
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
      throw fail(
        "News content cannot be empty.",
        400
      );
    }
  }

  return data;
};

// ==========================================
// PUBLIC NEWS
// ==========================================

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

  if (!news) {
    throw fail("News not found.");
  }

  return news;
};

// ==========================================
// ADMIN NEWS
// ==========================================

export const listAdminNews = async () =>
  News.find()
    .sort({ createdAt: -1 })
    .lean();

export const getAdminNews = async (id) => {
  validId(id);

  const news = await News.findById(id).lean();

  if (!news) {
    throw fail("News not found.");
  }

  return news;
};

// ==========================================
// MEDIA PAYLOAD VALIDATION
// ==========================================

const resolveMedia = async ({
  data,
  userId,
  newsId,
  session,
}) => {
  const mediaId = data.coverImageMediaId;

  if (!mediaId) {
    // Existing URL-only news remain compatible.
    return null;
  }

  if (!userId) {
    throw fail(
      "Authenticated user is required.",
      401
    );
  }

  if (!data.coverImage) {
    throw fail(
      "Cover image URL is required when a media ID is supplied.",
      400
    );
  }

  return validateNewsMedia({
    mediaId,
    imageUrl: data.coverImage,
    userId,
    newsId,
    session,
  });
};

// ==========================================
// CREATE NEWS
// ==========================================

export const createNews = async (
  payload,
  userId
) => {
  const data = clean(payload);
  const id = new mongoose.Types.ObjectId();

  const slugBase =
    slugify(data.title) || "news";

  const session = await mongoose.startSession();

  try {
    let createdNews;

    await session.withTransaction(async () => {
      const media = await resolveMedia({
        data,
        userId,
        newsId: id,
        session,
      });

      const [news] = await News.create(
        [{
          ...data,
          _id: id,
          slug: `${slugBase}-${id.toString().slice(-8)}`,
        }],
        { session }
      );

      if (media) {
        await attachNewsMedia({
          media,
          newsId: id,
          session,
        });
      }

      createdNews = news;
    });

    return createdNews;
  } finally {
    await session.endSession();
  }
};

// ==========================================
// UPDATE NEWS
// ==========================================

export const updateNews = async (
  id,
  payload,
  userId
) => {
  validId(id);

  const data = clean(payload);
  const session = await mongoose.startSession();

  let updatedNews;
  let oldMediaIdToDelete = null;

  try {
    await session.withTransaction(async () => {
      const news = await News.findById(id)
        .session(session);

      if (!news) {
        throw fail("News not found.");
      }

      const oldMediaId =
        news.coverImageMediaId?.toString() || null;

      const hasMediaId = Object.prototype.hasOwnProperty.call(
        data,
        "coverImageMediaId"
      );

      const hasImageUrl = Object.prototype.hasOwnProperty.call(
        data,
        "coverImage"
      );

      const nextMediaId = hasMediaId
        ? data.coverImageMediaId || null
        : oldMediaId;

      let nextImageUrl = hasImageUrl
        ? data.coverImage || ""
        : news.coverImage || "";

      // Removing the media ID removes the image URL too.
      if (hasMediaId && !nextMediaId) {
        if (hasImageUrl && nextImageUrl) {
          throw fail(
            "Removing a managed image requires an empty image URL.",
            400
          );
        }

        nextImageUrl = "";
      }

      const mediaChanged =
        String(oldMediaId || "") !==
        String(nextMediaId || "");

      const imageChanged =
        nextImageUrl !== (news.coverImage || "");

      // Do not permit replacing a managed image URL
      // while keeping its old media ID.
      if (
        oldMediaId &&
        imageChanged &&
        !mediaChanged
      ) {
        throw fail(
          "Changing an image requires a new media ID.",
          400
        );
      }

      // Require a new URL when replacing the media ID.
      if (
        mediaChanged &&
        nextMediaId &&
        !hasImageUrl
      ) {
        throw fail(
          "A new image URL is required.",
          400
        );
      }

      let nextMedia = null;

      if (nextMediaId) {
        nextMedia = await resolveMedia({
          data: {
            coverImage: nextImageUrl,
            coverImageMediaId: nextMediaId,
          },
          userId,
          newsId: news._id,
          session,
        });
      }

      // Preserve existing news fields and slug.
      Object.assign(news, data);

      if (hasMediaId || hasImageUrl) {
        news.coverImage = nextImageUrl;
        news.coverImageMediaId =
          nextMediaId || null;
      }

      await news.save({ session });

      if (mediaChanged && oldMediaId) {
        await detachNewsMedia({
          mediaId: oldMediaId,
          newsId: news._id,
          session,
        });
      }

      if (nextMedia) {
        await attachNewsMedia({
          media: nextMedia,
          newsId: news._id,
          session,
        });
      }

      // Set after successful transactional writes.
      oldMediaIdToDelete =
        mediaChanged ? oldMediaId : null;

      updatedNews = news;
    });

    // The transaction has committed successfully.
    if (oldMediaIdToDelete) {
      try {
        const cleanup = await deleteDetachedNewsImage(
          oldMediaIdToDelete
        );

        if (!cleanup.deleted) {
          console.warn("News image cleanup skipped", {
            newsId: id,
            mediaId: oldMediaIdToDelete,
            cleanup,
          });
        }
      } catch (error) {
        console.error("News image cleanup failed", {
          newsId: id,
          mediaId: oldMediaIdToDelete,
          message: error.message,
        });
      }
    }

    return updatedNews;
  } finally {
    await session.endSession();
  }
};


// ==========================================
// PUBLISH / UNPUBLISH
// ==========================================

export const setNewsPublication = async (
  id,
  isPublished
) => {
  validId(id);

  const news = await News.findById(id);

  if (!news) {
    throw fail("News not found.");
  }

  news.isPublished = isPublished;

  news.publishedAt = isPublished
    ? news.publishedAt || new Date()
    : null;

  await news.save();

  return news;
};

// ==========================================
// DELETE NEWS
// ==========================================

export const deleteNews = async (id) => {
  validId(id);

  const session = await mongoose.startSession();

  let deletedNews;
  let mediaIdToDelete = null;

  try {
    await session.withTransaction(async () => {
      const news = await News.findById(id)
        .session(session);

      if (!news) {
        throw fail("News not found.");
      }

      const oldMediaId =
        news.coverImageMediaId?.toString() || null;

      if (oldMediaId) {
        await detachNewsMedia({
          mediaId: oldMediaId,
          newsId: news._id,
          session,
        });
      }

      const result = await News.deleteOne(
        { _id: news._id },
        { session }
      );

      if (result.deletedCount !== 1) {
        throw fail(
          "News deletion failed.",
          409
        );
      }

      mediaIdToDelete = oldMediaId;
      deletedNews = news;
    });

    // The News deletion transaction has committed.
    if (mediaIdToDelete) {
      try {
        const cleanup = await deleteDetachedNewsImage(
          mediaIdToDelete
        );

        if (!cleanup.deleted) {
          console.warn("Deleted News media cleanup skipped", {
            newsId: id,
            mediaId: mediaIdToDelete,
            cleanup,
          });
        }
      } catch (error) {
        console.error("Deleted News media cleanup failed", {
          newsId: id,
          mediaId: mediaIdToDelete,
          message: error.message,
        });
      }
    }

    return deletedNews;
  } finally {
    await session.endSession();
  }
};
