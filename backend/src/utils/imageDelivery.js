
/**
 * ACC Image Delivery URL Helper
 *
 * Phase 1.3
 *
 * - Preserve original Cloudinary URLs.
 * - Support future custom delivery configuration.
 * - Never modify database media ownership fields.
 * - Do not enable custom delivery until the
 *   delivery provider and routing are configured.
 */

const DELIVERY_MODES = new Set([
  "cloudinary",
  "custom",
]);

const getConfig = () => {
  const mode =
    process.env.IMAGE_DELIVERY_MODE ||
    "cloudinary";

  if (!DELIVERY_MODES.has(mode)) {
    throw new Error(
      "Invalid IMAGE_DELIVERY_MODE."
    );
  }

  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME || "";

  const customBase =
    process.env.IMAGE_DELIVERY_BASE_URL || "";

  return {
    mode,
    cloudName,
    customBase,
  };
};

const getCloudinaryImagePath = (
  value,
  cloudName
) => {
  if (
    typeof value !== "string" ||
    !cloudName
  ) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !==
      "res.cloudinary.com" ||
    parsed.port ||
    parsed.username ||
    parsed.password
  ) {
    return null;
  }

  const prefix =
    `/${cloudName}/image/upload/`;

  if (!parsed.pathname.startsWith(prefix)) {
    return null;
  }

  const path = parsed.pathname.slice(
    prefix.length
  );

  if (
    !path ||
    path.includes("//") ||
    /%(?:2f|5c|00)/i.test(path) ||
    path.split("/").some(
      (segment) =>
        segment === "." ||
        segment === ".."
    )
  ) {
    return null;
  }

  return {
    path,
    search: parsed.search,
  };
};

export const toPublicImageUrl = (
  originalUrl
) => {
  if (!originalUrl) {
    return originalUrl;
  }

  const config = getConfig();

  if (config.mode === "cloudinary") {
    return originalUrl;
  }

  const image = getCloudinaryImagePath(
    originalUrl,
    config.cloudName
  );

  if (!image) {
    return originalUrl;
  }

  if (!config.customBase) {
    throw new Error(
      "IMAGE_DELIVERY_BASE_URL is required."
    );
  }

  let base;

  try {
    base = new URL(config.customBase);
  } catch {
    throw new Error(
      "Invalid IMAGE_DELIVERY_BASE_URL."
    );
  }

  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error(
      "Image delivery base must be a clean HTTPS URL."
    );
  }

  const basePath =
    base.pathname.replace(/\/+$/, "");

  return (
    `${base.origin}${basePath}/${image.path}` +
    image.search
  );
};

export const mapImageDelivery = (
  record,
  field = "imageUrl"
) => {
  if (!record) {
    return record;
  }

  return {
    ...record,
    [field]: toPublicImageUrl(
      record[field]
    ),
  };
};
