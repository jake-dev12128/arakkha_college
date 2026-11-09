
import { useState } from "react";

import {
  Box,
  Button,
  Input,
  Progress,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  courseLessonService,
} from "../../../services/courseLesson.service.js";

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Video upload failed.";

export default function CourseVideoUploader({
  courseId,
  lessonId,
  disabled = false,
  onUploaded,
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const upload = async () => {
    if (!file || !courseId || !lessonId || uploading) {
      return;
    }

    setUploading(true);
    setProgress(0);
    setError("");

    try {
      const result = await courseLessonService.uploadVideo(
        courseId,
        lessonId,
        file,
        setProgress
      );

      setFile(null);
      setProgress(100);
      onUploaded?.(result);
    } catch (err) {
      setError(getError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <VStack align="stretch" gap={3}>
      <Input
        type="file"
        accept="video/*"
        disabled={disabled || uploading}
        onChange={(event) => {
          setFile(event.target.files?.[0] || null);
          setError("");
          setProgress(0);
        }}
      />

      {file && (
        <Text fontSize="sm" color="fg.muted">
          {file.name} (
          {(file.size / 1024 / 1024).toFixed(1)} MB)
        </Text>
      )}

      {uploading && (
        <Box>
          <Text fontSize="sm" mb={2}>
            Uploading: {progress}%
          </Text>
          <Progress.Root value={progress} max={100}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            Upload progress does not include server verification.
          </Text>
        </Box>
      )}

      {error && (
        <Text color="red.500" fontSize="sm" role="alert">
          {error}
        </Text>
      )}

      <Button
        colorPalette="blue"
        disabled={disabled || uploading || !file}
        loading={uploading}
        onClick={upload}
      >
        Upload Lesson Video
      </Button>
    </VStack>
  );
}
