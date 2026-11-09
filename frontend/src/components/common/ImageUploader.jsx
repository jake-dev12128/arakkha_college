import { useState } from "react";
import {
  Box,
  Image,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";

import { mediaService } from "../../services/media.service.js";

export default function ImageUploader({
  category,
  value,
  onUploaded,
  onUploadingChange,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";
    setError("");

    if (file.size > 5 * 1024 * 1024) {
      setError("Maximum image size is 5 MB.");
      return;
    }

    if (![
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type)) {
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

      onUploaded(result);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Image upload failed."
      );
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <VStack align="stretch" gap="3">
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={uploading}
        onChange={handleChange}
      />

      {uploading && <Text>Uploading image...</Text>}

      {error && (
        <Text color="red.500" role="alert">
          {error}
        </Text>
      )}

      {value && (
        <Box>
          <Image
            src={value}
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