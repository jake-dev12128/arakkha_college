import { useState } from "react";
import { Box, Button, Heading, Spinner, Text, VStack } from "@chakra-ui/react";

/** Receives a short-lived URL from the authenticated backend; never constructs one. */
export default function SecureLessonVideoPlayer({
  playback,
  loading = false,
  error = "",
  onRetry,
}) {
  const [mediaError, setMediaError] = useState("");

  if (loading)
    return (
      <Text>
        <Spinner size="sm" /> Preparing secure playback...
      </Text>
    );
  if (error)
    return (
      <VStack align="stretch" gap={2}>
        <Text color="red.500" role="alert">
          {error}
        </Text>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </VStack>
    );
  if (!playback?.playbackUrl)
    return <Text color="fg.muted">Select a lesson to preview its video.</Text>;

  return (
    <VStack align="stretch" gap={3}>
      <Heading size="sm">{playback.title || "Lesson Video"}</Heading>
      <Box
        as="video"
        key={playback.playbackUrl}
        src={playback.playbackUrl}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        width="100%"
        minHeight="180px"
        maxHeight="420px"
        borderRadius="md"
        bg="black"
        onError={() =>
          setMediaError(
            "Video could not be loaded. The link may have expired or Cloudinary may have rejected the request.",
          )
        }
        onLoadedMetadata={() => setMediaError("")}
      />
      {mediaError && (
        <Text color="red.500" role="alert">
          {mediaError}
        </Text>
      )}
      <Text fontSize="xs" color="fg.muted">
        Playback links are temporary. Refresh the preview if playback fails or
        expires.
      </Text>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setMediaError("");
            onRetry();
          }}
        >
          Refresh Playback Link
        </Button>
      )}
    </VStack>
  );
}
