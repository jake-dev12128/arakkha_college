
import About from "../models/about.model.js";
import AppError from "../utils/AppError.js";
import { sanitizeRichText } from "../utils/sanitizeRichText.js";

const KEY = "main";

const sanitizeContent = (payload) => ({
  hero: {
    title: payload.hero.title,
    description: payload.hero.description,
  },
  introduction: {
    eyebrow: payload.introduction.eyebrow,
    title: payload.introduction.title,
    description: sanitizeRichText(
      payload.introduction.description
    ),
  },
  vision: {
    title: payload.vision.title,
    description: sanitizeRichText(
      payload.vision.description
    ),
  },
  mission: {
    title: payload.mission.title,
    description: sanitizeRichText(
      payload.mission.description
    ),
  },
});

const toAdminResponse = (about) => {
  if (!about) return null;

  const data = about.toObject();

  return {
    ...data.draft,
    _id: data._id,
    isPublished: data.isPublished,
    publishedAt: data.publishedAt,
    updatedAt: data.updatedAt,
  };
};

export const getPublicAbout = async () => {
  const about = await About.findOne({
    key: KEY,
    isPublished: true,
    published: { $ne: null },
  }).lean();

  if (!about) return null;

  return {
    ...about.published,
    _id: about._id,
    publishedAt: about.publishedAt,
  };
};

export const getAdminAbout = async () => {
  const about = await About.findOne({
    key: KEY,
  });

  return toAdminResponse(about);
};

export const saveAbout = async (payload, actorId) => {
  const sanitized = sanitizeContent(payload);

  let about = await About.findOne({ key: KEY });

  if (!about) {
    try {
      about = await About.create({
        key: KEY,
        draft: sanitized,
        published: null,
        isPublished: false,
        updatedBy: actorId,
      });

      return toAdminResponse(about);
    } catch (error) {
      if (error.code !== 11000) throw error;

      throw new AppError(
        "About Us was created concurrently. Please retry.",
        409,
        "ABOUT_CONFLICT"
      );
    }
  }

  about.draft = sanitized;
  about.updatedBy = actorId;

  await about.save();

  return toAdminResponse(about);
};

export const publishAbout = async (actorId) => {
  const about = await About.findOne({ key: KEY });

  if (!about) {
    throw new AppError(
      "Create About Us content first.",
      404,
      "ABOUT_NOT_FOUND"
    );
  }

  if (!about.draft) {
    throw new AppError(
      "Draft content is missing.",
      400,
      "ABOUT_DRAFT_MISSING"
    );
  }

  about.published = sanitizeContent(
    about.draft.toObject()
  );

  about.isPublished = true;
  about.publishedAt = new Date();
  about.updatedBy = actorId;

  await about.save();

  return toAdminResponse(about);
};

export const unpublishAbout = async (actorId) => {
  const about = await About.findOne({ key: KEY });

  if (!about) {
    throw new AppError(
      "About Us content not found.",
      404,
      "ABOUT_NOT_FOUND"
    );
  }

  about.isPublished = false;
  about.updatedBy = actorId;

  await about.save();

  return toAdminResponse(about);
};
