import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Container, Flex, Heading, Spinner, Text, VStack } from "@chakra-ui/react";
import { Link as RouterLink, useParams } from "react-router-dom";
import PageHero from "../../components/common/PageHero.jsx";
import CourseLearningPlaylist from "../../components/public/CourseLearningPlaylist.jsx";
import SecureLessonVideoPlayer from "../../components/dashboard/academic/SecureLessonVideoPlayer.jsx";
import { getPublishedProgramCourses } from "../../services/publicAcademic.service.js";
import { coursePlaybackService } from "../../services/coursePlayback.service.js";

const getId = (item) => String(item?._id ?? item?.id ?? "");
const messageOf = (error) => error?.response?.data?.message || error?.message || "Unable to load data.";
const canceled = (error) => error?.name === "AbortError" || error?.name === "CanceledError" || error?.code === "ERR_CANCELED";

export default function CourseDetail() {
  const { programId, courseId } = useParams();
  const [programData, setProgramData] = useState(null);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState("");
  const [tab, setTab] = useState("overview");
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [lessonsError, setLessonsError] = useState("");
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [playback, setPlayback] = useState(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCourseLoading(true);
    setCourseError("");
    setProgramData(null);
    getPublishedProgramCourses(programId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setProgramData(data); })
      .catch((error) => { if (!controller.signal.aborted && !canceled(error)) setCourseError(messageOf(error)); })
      .finally(() => { if (!controller.signal.aborted) setCourseLoading(false); });
    return () => controller.abort();
  }, [programId]);

  const course = useMemo(() => (programData?.semesters ?? [])
    .flatMap((semester) => semester.courses ?? [])
    .find((item) => getId(item) === courseId), [programData, courseId]);

  useEffect(() => {
    const controller = new AbortController();
    setLessons([]);
    setActiveLessonId(null);
    setPlayback(null);
    setLessonsError("");
    setLessonsLoading(true);
    coursePlaybackService.listAccessible(courseId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const items = Array.isArray(data) ? data : Array.isArray(data?.lessons) ? data.lessons : [];
        setLessons([...items].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)));
      })
      .catch((error) => { if (!controller.signal.aborted && !canceled(error)) setLessonsError(messageOf(error)); })
      .finally(() => { if (!controller.signal.aborted) setLessonsLoading(false); });
    return () => controller.abort();
  }, [courseId]);

  useEffect(() => {
    if (!activeLessonId) return;
    const controller = new AbortController();
    setPlayback(null);
    setPlaybackError("");
    setPlaybackLoading(true);
    coursePlaybackService.getPlayback(courseId, activeLessonId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setPlayback(data); })
      .catch((error) => { if (!controller.signal.aborted && !canceled(error)) setPlaybackError(messageOf(error)); })
      .finally(() => { if (!controller.signal.aborted) setPlaybackLoading(false); });
    return () => controller.abort();
  }, [courseId, activeLessonId, refreshKey]);

  const activeLesson = lessons.find((lesson) => getId(lesson) === activeLessonId);
  const goToLessons = () => setTab("lessons");

  return (
    <>
      <PageHero title={course?.title ?? "Course Learning"}
        description="Explore course information and learn through your accessible video lessons." />
      <Container maxW="1280px" py={{ base: 7, md: 12 }}>
        <Flex align="center" justify="space-between" gap={3} wrap="wrap" mb={7}>
          <Button as={RouterLink} to={`/academic/courses/${encodeURIComponent(programId)}`} variant="outline" size="sm">
            ← Back to Courses
          </Button>
          {course?.code && <Badge colorPalette="blue" variant="subtle">{course.code}</Badge>}
        </Flex>

        {courseLoading ? <Flex justify="center" py={16}><Spinner size="xl" /></Flex>
        : courseError ? <Text color="red.500" role="alert">{courseError}</Text>
        : !course ? <Box py={12} textAlign="center"><Heading size="md">Course not found in this published program.</Heading></Box>
        : (
          <VStack align="stretch" gap={6}>
            <Box borderWidth="1px" borderColor="var(--public-border)" borderRadius="2xl"
              bg="var(--public-surface)" p={{ base: 5, md: 7 }}>
              <Text fontSize="xs" fontWeight="bold" color="var(--public-accent)">COURSE INFORMATION</Text>
              <Heading size="xl" mt={2} color="var(--public-text)">{course.title}</Heading>
              <Text color="var(--public-muted)" mt={3} lineHeight="1.8">
                {course.description || "Explore the lessons and topics covered in this course."}
              </Text>
              <Flex mt={5} gap={2} wrap="wrap">
                <Badge variant="outline">{course.credits ?? "—"} Credits</Badge>
                <Badge variant="outline">Theory: {course.lectureHours ?? "—"} hours</Badge>
                <Badge variant="outline">Practical: {course.practicalHours ?? "—"} hours</Badge>
                <Badge colorPalette="blue" variant="subtle">{course.courseType || "Course"}</Badge>
              </Flex>
            </Box>

            <Flex gap={2} borderBottomWidth="1px" borderColor="var(--public-border)" pb={3}>
              <Button variant={tab === "overview" ? "solid" : "outline"} colorPalette="blue" size="sm"
                onClick={() => setTab("overview")}>Overview</Button>
              <Button variant={tab === "lessons" ? "solid" : "outline"} colorPalette="blue" size="sm"
                onClick={goToLessons}>Lessons {lessonsError ? "" : `(${lessons.length})`}</Button>
            </Flex>

            {tab === "overview" ? (
              <Box bg="var(--public-surface)" borderWidth="1px" borderColor="var(--public-border)"
                borderRadius="xl" p={{ base: 5, md: 7 }}>
                <Heading size="md" color="var(--public-text)">Course Overview</Heading>
                <Text mt={3} color="var(--public-muted)" lineHeight="1.9">
                  {course.description || "Course details are being prepared."}
                </Text>
                <Flex gap={4} mt={6} wrap="wrap">
                  <Box><Text fontSize="xs" color="var(--public-muted)">Credits</Text><Text fontWeight="bold">{course.credits ?? "—"}</Text></Box>
                  <Box><Text fontSize="xs" color="var(--public-muted)">Lecture Hours</Text><Text fontWeight="bold">{course.lectureHours ?? "—"}</Text></Box>
                  <Box><Text fontSize="xs" color="var(--public-muted)">Practical Hours</Text><Text fontWeight="bold">{course.practicalHours ?? "—"}</Text></Box>
                </Flex>
                <Button mt={7} colorPalette="blue" onClick={goToLessons}>Explore Lessons</Button>
              </Box>
            ) : (
              <Box bg="var(--public-surface)" borderWidth="1px" borderColor="var(--public-border)"
                borderRadius="2xl" p={{ base: 4, md: 6 }}>
                <Flex justify="space-between" align="center" mb={5} gap={3} wrap="wrap">
                  <Heading size="md" color="var(--public-text)">Course Learning</Heading>
                  <Badge colorPalette="blue" variant="subtle">{lessons.length} Lessons</Badge>
                </Flex>
                {lessonsLoading ? <Flex justify="center" py={10}><Spinner /></Flex>
                : lessonsError ? (
                  <Box py={8}>
                    <Text color="var(--public-muted)" role="alert">Lessons are not available for this account: {lessonsError}</Text>
                  </Box>
                ) : lessons.length === 0 ? (
                  <Text color="var(--public-muted)" py={10} textAlign="center">No accessible video lessons are available for this course yet.</Text>
                ) : (
                  <Flex direction={{ base: "column", lg: "row" }} align="stretch" gap={6}>
                    <Box flex="1 1 65%" minW={0}>
                      <Box bg="#162238" borderRadius="xl" overflow="hidden"
                        minHeight={{ base: "200px", md: "280px" }}
                        display="flex" justifyContent="center" alignItems="center">
                        {activeLessonId ? (
                          <Box width="100%" p={3} color="white">
                            <SecureLessonVideoPlayer playback={playback} loading={playbackLoading}
                              error={playbackError} onRetry={() => setRefreshKey((value) => value + 1)} />
                          </Box>
                        ) : (
                          <VStack gap={3} textAlign="center" p={4}>
                            <Text color="white" fontSize="3xl">▶</Text>
                            <Text color="white" fontSize="sm">Select a lesson to start learning</Text>
                          </VStack>
                        )}
                      </Box>
                      {activeLesson && (
                        <Box mt={4}>
                          <Heading size="md" color="var(--public-text)">{activeLesson.title}</Heading>
                          {activeLesson.description && <Text mt={2} color="var(--public-muted)">{activeLesson.description}</Text>}
                        </Box>
                      )}
                    </Box>
                    <Box flex="1 1 35%" minW={0}>
                      <Flex justify="space-between" align="center" mb={3}>
                        <Heading size="sm" color="var(--public-text)">Lesson Playlist</Heading>
                        <Text fontSize="xs" color="var(--public-muted)">{lessons.length} items</Text>
                      </Flex>
                      <Box maxHeight={{ base: "none", lg: "520px" }} overflowY={{ base: "visible", lg: "auto" }}>
                        <CourseLearningPlaylist lessons={lessons} activeLessonId={activeLessonId}
                          onSelect={setActiveLessonId} />
                      </Box>
                    </Box>
                  </Flex>
                )}
              </Box>
            )}
          </VStack>
        )}
      </Container>
    </>
  );
}
