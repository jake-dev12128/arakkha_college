
import AcademicYear from "../models/academicYear.model.js";
import EntranceInformation from "../models/entranceInformation.model.js";
import EntranceList from "../models/entranceList.model.js";
import EntranceApplicant from "../models/entranceApplicant.model.js";
import AppError from "../utils/AppError.js";

const missing = () =>
  new AppError("Resource not found.", 404, "NOT_FOUND");

const get = async (Model, id) => {
  const record = await Model.findById(id);
  if (!record) throw missing();
  return record;
};

const ensureYear = async (id) => {
  if (!(await AcademicYear.exists({ _id: id }))) {
    throw new AppError(
      "Academic year not found.",
      404,
      "ACADEMIC_YEAR_NOT_FOUND"
    );
  }
};

const validateDates = (x) => {
  if (
    x.applicationStartDate &&
    x.applicationEndDate &&
    new Date(x.applicationEndDate) >
      new Date(x.applicationStartDate)
  ) {
    return;
  }

  if (x.applicationStartDate && x.applicationEndDate) {
    throw new AppError(
      "Application end date must follow start date.",
      400,
      "INVALID_DATES"
    );
  }
};

const assertDraft = (doc) => {
  if (doc.status !== "draft") {
    throw new AppError(
      "Only draft records may be edited.",
      409,
      "NOT_DRAFT"
    );
  }
};

const validatePdf = (x) => {
  if (
    x.application?.pdfUrl &&
    new URL(x.application.pdfUrl).protocol !== "https:"
  ) {
    throw new AppError(
      "HTTPS PDF URL required.",
      400,
      "INVALID_PDF_URL"
    );
  }
};

// ========================================
// ENTRANCE INFORMATION
// ========================================

export const createInformation = async (body, userId) => {
  await ensureYear(body.academicYear);
  validateDates(body);
  validatePdf(body);

  return EntranceInformation.create({
    ...body,
    createdBy: userId,
    updatedBy: userId,
  });
};

export const updateInformation = async (id, body, userId) => {
  const doc = await get(EntranceInformation, id);
  assertDraft(doc);

  doc.set(body);
  validateDates(doc);
  validatePdf(doc);

  doc.updatedBy = userId;
  await doc.save();

  return doc;
};

// ========================================
// ENTRANCE LIST
// ========================================

export const createList = async (body, userId) => {
  await ensureYear(body.academicYear);

  return EntranceList.create({
    ...body,
    createdBy: userId,
    updatedBy: userId,
  });
};

export const updateList = async (id, body, userId) => {
  const doc = await get(EntranceList, id);
  assertDraft(doc);

  doc.set(body);
  doc.updatedBy = userId;

  await doc.save();
  return doc;
};

// ========================================
// PUBLICATION
// ========================================

export const setPublication = async (
  Model,
  id,
  action,
  userId
) => {
  const doc = await get(Model, id);

  if (action === "publish") {
    assertDraft(doc);

    if (
      Model === EntranceInformation &&
      (!doc.requirements.length || !doc.awards.length)
    ) {
      throw new AppError(
        "Requirements and awards are required.",
        400,
        "INCOMPLETE_INFORMATION"
      );
    }

    if (
      Model === EntranceList &&
      !(await EntranceApplicant.exists({
        entranceList: id,
        admissionStatus: "admitted",
      }))
    ) {
      throw new AppError(
        "No admitted applicants to publish.",
        400,
        "EMPTY_ADMISSION_LIST"
      );
    }

    doc.status = "published";
    doc.publishedAt = new Date();
  } else {
    if (doc.status !== "published") {
      throw new AppError(
        "Only published records can be archived.",
        409,
        "NOT_PUBLISHED"
      );
    }

    doc.status = "archived";
  }

  doc.updatedBy = userId;
  await doc.save();

  return doc;
};

// ========================================
// APPLICANTS
// ========================================

export const createApplicant = async (listId, body) => {
  const list = await get(EntranceList, listId);
  assertDraft(list);

  return EntranceApplicant.create({
    ...body,
    entranceList: listId,
  });
};

export const updateApplicant = async (
  listId,
  id,
  body
) => {
  const list = await get(EntranceList, listId);
  assertDraft(list);

  const doc = await EntranceApplicant.findOne({
    _id: id,
    entranceList: listId,
  }).select("+nationalId");

  if (!doc) throw missing();

  doc.set(body);
  await doc.save();

  return doc;
};

export const deleteApplicant = async (listId, id) => {
  const list = await get(EntranceList, listId);
  assertDraft(list);

  const result = await EntranceApplicant.deleteOne({
    _id: id,
    entranceList: listId,
  });

  if (!result.deletedCount) throw missing();

  return { deleted: true };
};

export const listApplicantsAdmin = async (
  listId,
  { page, limit }
) => {
  await get(EntranceList, listId);

  const filter = { entranceList: listId };

  const [items, total] = await Promise.all([
    EntranceApplicant.find(filter)
      .sort({ displayOrder: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("+nationalId")
      .lean(),

    EntranceApplicant.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

// ========================================
// PUBLIC API
// ========================================

// ========================================
// PUBLIC ACADEMIC YEAR RESOLUTION
// ========================================

const publishedYear = async (year) => {
  // Current active academic year
  if (year === "current") {
    const activeYears = await AcademicYear.find({
      status: "active",
      isActive: true,
    })
      .sort({ startDate: -1, _id: -1 })
      .limit(2)
      .lean();

    if (activeYears.length === 0) {
      throw new AppError(
        "No active academic year is configured.",
        404,
        "ACTIVE_ACADEMIC_YEAR_NOT_FOUND"
      );
    }

    if (activeYears.length > 1) {
      throw new AppError(
        "Multiple active academic years are configured.",
        409,
        "MULTIPLE_ACTIVE_ACADEMIC_YEARS"
      );
    }

    return activeYears[0];
  }

  // Existing year-based lookup
  const escapedYear = String(year).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const academicYear = await AcademicYear.findOne({
    $or: [
      { code: String(year).toUpperCase() },
      { name: year },
      {
        code: {
          $regex: `^AY${escapedYear}-\\d{4}$`,
        },
      },
    ],
  }).lean();

  if (!academicYear) {
    throw new AppError(
      "Academic year not found.",
      404,
      "ACADEMIC_YEAR_NOT_FOUND"
    );
  }

  return academicYear;
};
export const publicInformation = async (year) => {
  const academicYear = await publishedYear(year);

  const doc = await EntranceInformation.findOne({
    academicYear: academicYear._id,
    status: "published",
    publishedAt: { $lte: new Date() },
  })
    .select("-createdBy -updatedBy -application.storageKey")
    .lean();

  if (!doc) throw missing();

  return {
    academicYear: {
      code: academicYear.code,
      name: academicYear.name,
    },
    information: doc,
  };
};

const maskNrc = () => "Not publicly disclosed";

export const publicApplicants = async (
  year,
  { page, limit }
) => {
  const academicYear = await publishedYear(year);

  const list = await EntranceList.findOne({
    academicYear: academicYear._id,
    status: "published",
    publishedAt: { $lte: new Date() },
  }).lean();

  if (!list) throw missing();

  const filter = {
    entranceList: list._id,
    admissionStatus: "admitted",
  };

  const [records, total] = await Promise.all([
    EntranceApplicant.find(filter)
      .sort({ displayOrder: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("firstName lastName fatherName displayOrder")
      .lean(),

    EntranceApplicant.countDocuments(filter),
  ]);

  return {
    title: list.title,
    description: list.description,
    academicYear: academicYear.name,
    page,
    limit,
    total,
    items: records.map((r, i) => ({
      no: (page - 1) * limit + i + 1,
      name: `${r.firstName} ${r.lastName}`.trim(),
      nrc: maskNrc(),
      fatherName: r.fatherName,
    })),
  };
};

// ========================================
// ADMIN READ
// ========================================

export const listAdmin = async (
  Model,
  { page, limit }
) => {
  const [items, total] = await Promise.all([
    Model.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Model.countDocuments(),
  ]);

  return { items, total, page, limit };
};

export const detailAdmin = (Model, id) =>
  get(Model, id);
