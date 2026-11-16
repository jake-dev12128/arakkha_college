
import { useEffect, useState } from "react";

import {
  Box,
  Image,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";

import { mediaService } from "../../services/media.service.js";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function ImageUploader({
  category,
  value,
  onUploaded,
  onUploadingChange,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Keep the original URL for form attachment,
  // and the delivery URL for preview only.
  const [uploadedPreview, setUploadedPreview] =
    useState(null);

  // Clear an old preview when the uploader
  // category changes.
  useEffect(() => {
    setUploadedPreview(null);
    setError("");
  }, [category]);

  const handleChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";
    setError("");

    if (uploading) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Maximum image size is 5 MB.");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Unsupported image format.");
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);

    try {
      const result = await mediaService.uploadImage(
        category,
        file
      );

      if (!result?.mediaId || !result?.url) {
        throw new Error(
          "Image upload returned incomplete data."
        );
      }

      // Preserve the original upload response.
      // Parent forms still save result.url and
      // result.mediaId using their existing logic.
      onUploaded?.(result);

      // Use the custom delivery URL for preview
      // only when the parent value matches the
      // uploaded original URL.
      setUploadedPreview({
        originalUrl: result.url,
        deliveryUrl:
          result.deliveryUrl || result.url,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Image upload failed."
      );
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const previewUrl =
    value &&
    uploadedPreview?.originalUrl === value
      ? uploadedPreview.deliveryUrl
      : value;

  return (
    <VStack align="stretch" gap="3">
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={uploading}
        onChange={handleChange}
      />

      {uploading && (
        <Text>Uploading image...</Text>
      )}

      {error && (
        <Text color="red.500" role="alert">
          {error}
        </Text>
      )}

      {previewUrl && (
        <Box>
          <Image
            src={previewUrl}
            maxH="200px"
            objectFit="contain"
            borderRadius="lg"
            alt="Uploaded preview"
          />
        </Box>
      )}
    </VStack>
  );
}
