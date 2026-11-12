
import { useRef, useState } from "react";

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

const MAX_VIDEO_BYTES = 90 * 1024 * 1024;

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Video upload failed.";

export default function CourseVideoUploader({
  courseId,
  lessonId,
  disabled = false,
  onUploaded,
  onUploadingChange,
}) {
  const inputRef = useRef(null);
  const uploadingRef = useRef(false);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;

    setError("");
    setProgress(0);
    setStatus("idle");
    setFile(null);

    if (!selected) {
      return;
    }

    if (
      !selected.type ||
      !selected.type.startsWith("video/")
    ) {
      setError("Only video files are supported.");
      event.target.value = "";
      return;
    }

    if (selected.size === 0) {
      setError("The selected video file is empty.");
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_VIDEO_BYTES) {
      setError(
        "Maximum supported video size is 90 MB."
      );
      event.target.value = "";
      return;
    }

    setFile(selected);
  };

  const upload = async () => {
    if (
      !file ||
      !courseId ||
      !lessonId ||
      disabled ||
      uploadingRef.current
    ) {
      return;
    }

    uploadingRef.current = true;

    setUploading(true);
    onUploadingChange?.(true);
    setProgress(0);
    setStatus("uploading");
    setError("");

    let result;

    try {
      result = await courseLessonService.uploadVideo(
        courseId,
        lessonId,
        file,
        (value) => setProgress(value),
        (stage) => setStatus(stage)
      );
    } catch (err) {
      setStatus("error");
      setError(getError(err));
      return;
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      onUploadingChange?.(false);
    }

    setStatus("success");
    setProgress(100);
    setFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    // Upload already succeeded.
    // Parent refresh errors should not be
    // reported as upload failures.
    try {
      await onUploaded?.(result);
    } catch (err) {
      setError(
        "Video uploaded successfully, but refreshing the lesson failed. Please reload the lesson list."
      );
    }
  };

  return (
    <VStack align="stretch" gap={3}>
      <Input
        ref={inputRef}
        type="file"
        accept="video/*"
        disabled={disabled || uploading}
        onChange={handleFileChange}
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
            {status === "verifying"
              ? "Verifying uploaded video..."
              : `Uploading: ${progress}%`}
          </Text>

          <Progress.Root
            value={progress}
            max={100}
          >
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>

          <Text
            fontSize="xs"
            color="fg.muted"
            mt={1}
          >
            {status === "verifying"
              ? "Cloudinary upload completed. Waiting for server verification."
              : status === "signing"
                ? "Requesting a signed upload authorization..."
                : "Uploading video securely to Cloudinary."}
          </Text>
        </Box>
      )}

      {status === "success" && (
        <Text
          color="green.500"
          fontSize="sm"
          role="status"
        >
          Video uploaded and verified successfully.
        </Text>
      )}

      {error && (
        <Text
          color="red.500"
          fontSize="sm"
          role="alert"
        >
          {error}
        </Text>
      )}

      <Button
        colorPalette="blue"
        disabled={
          disabled ||
          uploading ||
          !file ||
          !courseId ||
          !lessonId
        }
        loading={uploading}
        onClick={upload}
      >
        Upload Lesson Video
      </Button>
    </VStack>
  );
}
