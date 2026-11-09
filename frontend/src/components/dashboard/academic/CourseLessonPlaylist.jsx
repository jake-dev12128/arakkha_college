
import {
  Box,
  Badge,
  Button,
  Flex,
  Text,
  VStack,
} from "@chakra-ui/react";

// ==========================================
// FORMAT VIDEO DURATION
// ==========================================

const durationLabel = (seconds) => {
  if (
    !Number.isFinite(Number(seconds)) ||
    Number(seconds) < 0
  ) {
    return null;
  }

  const total = Math.floor(Number(seconds));
  const minutes = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  const hours = Math.floor(minutes / 60);

  return hours
    ? `${hours}:${String(minutes % 60).padStart(2, "0")}:${secs}`
    : `${minutes}:${secs}`;
};

// ==========================================
// SHARED COURSE LESSON PLAYLIST
// ==========================================

export default function CourseLessonPlaylist({
  lessons = [],
  activeLessonId = null,
  onSelect,
  renderPlayer,
  renderActions,
  showStatus = false,
  durationById = {},
}) {
  return (
    <VStack align="stretch" gap={3}>
      {lessons.map((lesson, index) => {
        const id = String(lesson.id || lesson._id);

        const active =
          String(activeLessonId) === id;

        const playable = Boolean(
          lesson.hasVideo || lesson.videoMediaId
        );

        const duration = durationLabel(
          durationById[id] ?? lesson.duration
        );

        return (
          <Box
            key={id}
            p={3}
            borderWidth="1px"
            borderRadius="lg"
            borderColor={
              active ? "blue.400" : "border"
            }
          >
            {/* LESSON INFORMATION */}

            <Flex align="start" gap={3}>
              <Text
                fontSize="sm"
                color="fg.muted"
                pt={2}
                minW="18px"
              >
                {index + 1}
              </Text>

              {/* VIDEO PREVIEW TILE */}

              <Button
                type="button"
                variant="plain"
                p={0}
                height="auto"
                minW="112px"
                width="132px"
                disabled={!playable}
                onClick={() => onSelect?.(lesson)}
                aria-label={`Play ${lesson.title}`}
              >
                <Box
                  position="relative"
                  w="100%"
                  aspectRatio="16 / 9"
                  borderRadius="md"
                  bg="gray.800"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  overflow="hidden"
                >
                  <Text
                    color="white"
                    fontSize="2xl"
                  >
                    {playable ? "▶" : "—"}
                  </Text>

                  {duration && (
                    <Box
                      position="absolute"
                      right="4px"
                      bottom="4px"
                      px={1}
                      borderRadius="sm"
                      bg="blackAlpha.800"
                    >
                      <Text
                        color="white"
                        fontSize="2xs"
                      >
                        {duration}
                      </Text>
                    </Box>
                  )}
                </Box>
              </Button>

              {/* LESSON TITLE */}

              <Box flex="1" minW={0}>
                <Button
                  type="button"
                  variant="plain"
                  height="auto"
                  whiteSpace="normal"
                  textAlign="left"
                  justifyContent="flex-start"
                  p={0}
                  fontWeight="semibold"
                  disabled={!playable}
                  onClick={() => onSelect?.(lesson)}
                >
                  {lesson.title}
                </Button>

                {lesson.description && (
                  <Text
                    mt={1}
                    fontSize="xs"
                    color="fg.muted"
                    lineClamp={2}
                  >
                    {lesson.description}
                  </Text>
                )}

                {showStatus && (
                  <Badge
                    mt={2}
                    colorPalette={
                      lesson.isPublished
                        ? "green"
                        : "gray"
                    }
                  >
                    {lesson.isPublished
                      ? "Published"
                      : "Draft"}
                  </Badge>
                )}

                {!playable && (
                  <Text
                    mt={1}
                    fontSize="xs"
                    color="fg.muted"
                  >
                    No video attached
                  </Text>
                )}
              </Box>
            </Flex>

            {/* SELECTED LESSON VIDEO PLAYER */}

            {active && renderPlayer && (
              <Box mt={3}>
                {renderPlayer(lesson)}
              </Box>
            )}

            {/* ADMIN CRUD BUTTONS */}

            {renderActions && (
              <Box mt={3}>
                {renderActions(lesson)}
              </Box>
            )}
          </Box>
        );
      })}
    </VStack>
  );
}
