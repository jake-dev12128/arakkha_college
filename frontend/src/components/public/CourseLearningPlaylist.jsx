import { Badge, Box, Button, Flex, Text, VStack } from "@chakra-ui/react";

const lessonId = (lesson) => String(lesson?._id ?? lesson?.id ?? "");

export default function CourseLearningPlaylist({ lessons = [], activeLessonId, onSelect, busy = false }) {
  return (
    <VStack align="stretch" gap={2}>
      {lessons.map((lesson, index) => {
        const id = lessonId(lesson);
        const active = id === String(activeLessonId ?? "");
        const playable = Boolean(lesson.hasVideo || lesson.videoMediaId);
        return (
          <Button key={id || index} type="button" variant="plain" width="100%" height="auto"
            p={0} textAlign="left" whiteSpace="normal" disabled={!playable || busy}
            onClick={() => onSelect?.(id)} aria-current={active ? "true" : undefined}>
            <Flex width="100%" align="center" gap={3} p={3} borderWidth="1px" borderRadius="lg"
              borderColor={active ? "blue.400" : "var(--public-border)"}
              bg={active ? "var(--public-surface-alt)" : "var(--public-surface)"}
              transition="background 0.2s, border-color 0.2s">
              <Box width="42px" height="42px" flexShrink={0} borderRadius="md" bg="var(--public-surface-alt)"
                display="flex" alignItems="center" justifyContent="center"
                color="var(--public-text)" fontSize="sm" fontWeight="bold">
                {active ? "▶" : String(lesson.order ?? index + 1).padStart(2, "0")}
              </Box>
              <Box flex="1" minW={0}>
                <Text fontSize="sm" fontWeight="semibold" color="var(--public-text)" lineClamp={2}>
                  {lesson.title || `Lesson ${index + 1}`}
                </Text>
                {lesson.description && (
                  <Text mt={1} fontSize="xs" color="var(--public-muted)" lineClamp={2}>{lesson.description}</Text>
                )}
              </Box>
              {!playable && <Badge colorPalette="gray" variant="subtle">No video</Badge>}
            </Flex>
          </Button>
        );
      })}
    </VStack>
  );
}
