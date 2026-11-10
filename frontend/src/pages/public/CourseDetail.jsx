
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  Link as RouterLink,
  useParams,
} from "react-router-dom";

import {
  FiArrowLeft,
  FiBookOpen,
  FiLock,
} from "react-icons/fi";

import PageHero from "../../components/common/PageHero.jsx";

import CourseLearningPlaylist from "../../components/public/CourseLearningPlaylist.jsx";

import SecureLessonVideoPlayer from "../../components/dashboard/academic/SecureLessonVideoPlayer.jsx";

import {
  getPublishedProgramCourses,
} from "../../services/publicAcademic.service.js";

import {
  coursePlaybackService,
} from "../../services/coursePlayback.service.js";

const getId = (item) =>
  String(item?._id ?? item?.id ?? "");

const messageOf = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to load data.";

const canceled = (error) =>
  error?.name === "AbortError" ||
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

function CourseStatus({ title, message }) {
  return (
    <Box
      maxW="700px"
      mx="auto"
      bg="var(--public-surface)"
      borderWidth="1px"
      borderColor="var(--public-border)"
      borderRadius="2xl"
      p={{ base: 6, md: 10 }}
      textAlign="center"
    >
      <VStack gap={4}>
        <Flex
          w="68px"
          h="68px"
          borderRadius="full"
          bg="var(--public-surface-alt)"
          color="var(--public-accent)"
          justify="center"
          align="center"
        >
          <FiLock size={30} />
        </Flex>

        <Heading
          size="lg"
          color="var(--public-text)"
        >
          {title}
        </Heading>

        <Text
          color="var(--public-muted)"
          lineHeight="1.8"
        >
          {message}
        </Text>

        <Button
          as={RouterLink}
          to="/programs"
          colorPalette="blue"
        >
          <FiArrowLeft />
          Back to Programs
        </Button>
      </VStack>
    </Box>
  );
}

export default function CourseDetail() {
  const { programId, courseId } = useParams();

  const [programData, setProgramData] =
    useState(null);

  const [courseLoading, setCourseLoading] =
    useState(true);

  const [courseError, setCourseError] =
    useState("");

  const [tab, setTab] =
    useState("overview");

  const [lessons, setLessons] =
    useState([]);

  const [lessonsLoading, setLessonsLoading] =
    useState(false);

  const [lessonsError, setLessonsError] =
    useState("");

  const [activeLessonId, setActiveLessonId] =
    useState(null);

  const [playback, setPlayback] =
    useState(null);

  const [playbackLoading, setPlaybackLoading] =
    useState(false);

  const [playbackError, setPlaybackError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  // ========================================
  // LOAD AUTHORIZED COURSE CATALOG
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    setCourseLoading(true);
    setCourseError("");
    setProgramData(null);
    setTab("overview");

    getPublishedProgramCourses(
      programId,
      controller.signal
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setProgramData(data);
        }
      })
      .catch((error) => {
        if (
          !controller.signal.aborted &&
          !canceled(error)
        ) {
          setCourseError(messageOf(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCourseLoading(false);
        }
      });

    return () => controller.abort();
  }, [programId]);

  const course = useMemo(
    () =>
      (programData?.semesters ?? [])
        .flatMap(
          (semester) =>
            semester.courses ?? []
        )
        .find(
          (item) =>
            getId(item) === courseId
        ),
    [programData, courseId]
  );

  // ========================================
  // LOAD LESSONS ONLY AFTER COURSE ACCESS
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    setLessons([]);
    setLessonsError("");
    setActiveLessonId(null);
    setPlayback(null);
    setPlaybackError("");
    setLessonsLoading(false);

    // Do not request protected lessons
    // until the course has been authorized
    // through the program catalog.
    if (
      courseLoading ||
      courseError ||
      !course
    ) {
      return () => controller.abort();
    }

    setLessonsLoading(true);

    coursePlaybackService
      .listAccessible(
        courseId,
        controller.signal
      )
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.lessons)
            ? data.lessons
            : [];

        setLessons(
          [...items].sort(
            (a, b) =>
              Number(a.order ?? 0) -
              Number(b.order ?? 0)
          )
        );
      })
      .catch((error) => {
        if (
          !controller.signal.aborted &&
          !canceled(error)
        ) {
          setLessonsError(
            messageOf(error)
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLessonsLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    courseId,
    course,
    courseLoading,
    courseError,
  ]);

  // ========================================
  // LOAD AUTHORIZED PLAYBACK
  // ========================================

  useEffect(() => {
    if (
      !course ||
      !activeLessonId ||
      !lessons.some(
        (lesson) =>
          getId(lesson) === activeLessonId
      )
    ) {
      return;
    }

    const controller = new AbortController();

    setPlayback(null);
    setPlaybackError("");
    setPlaybackLoading(true);

    coursePlaybackService
      .getPlayback(
        courseId,
        activeLessonId,
        controller.signal
      )
      .then((data) => {
        if (!controller.signal.aborted) {
          setPlayback(data);
        }
      })
      .catch((error) => {
        if (
          !controller.signal.aborted &&
          !canceled(error)
        ) {
          setPlaybackError(
            messageOf(error)
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPlaybackLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    courseId,
    course,
    activeLessonId,
    lessons,
    refreshKey,
  ]);

  const activeLesson = lessons.find(
    (lesson) =>
      getId(lesson) === activeLessonId
  );

  return (
    <>
      <PageHero
        title={
          course?.title ??
          "Course Learning"
        }
        description="Explore course information and access your learning materials."
      />

      <Box
        bg="var(--public-bg)"
        color="var(--public-text)"
        minH="45vh"
      >
        <Container
          maxW="1200px"
          py={{ base: 8, md: 12 }}
        >
          <Button
            as={RouterLink}
            to={`/academic/courses/${encodeURIComponent(programId)}`}
            variant="outline"
            mb={8}
            color="var(--public-text)"
            borderColor="var(--public-border)"
          >
            <FiArrowLeft />
            Back to Courses
          </Button>

          {courseLoading ? (
            <Flex justify="center" py={16}>
              <Spinner
                size="xl"
                color="blue.500"
              />
            </Flex>
          ) : courseError ? (
            <CourseStatus
              title="Course Access Restricted"
              message={courseError}
            />
          ) : !course ? (
            <CourseStatus
              title="Course Not Available"
              message="This course is not available to your account in the selected program."
            />
          ) : (
            <VStack
              align="stretch"
              gap={6}
            >
              <Box
                bg="var(--public-surface)"
                borderWidth="1px"
                borderColor="var(--public-border)"
                borderRadius="2xl"
                p={{ base: 6, md: 8 }}
              >
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  letterSpacing="widest"
                  color="var(--public-accent)"
                >
                  COURSE INFORMATION
                </Text>

                <Heading
                  size="xl"
                  mt={3}
                  color="var(--public-text)"
                >
                  {course.title}
                </Heading>

                <Text
                  mt={3}
                  color="var(--public-muted)"
                  lineHeight="1.9"
                >
                  {course.description ||
                    "Explore the knowledge and skills covered in this course."}
                </Text>

                <Flex
                  gap={3}
                  wrap="wrap"
                  mt={6}
                >
                  <Badge variant="outline">
                    {course.code || "Course"}
                  </Badge>

                  <Badge variant="outline">
                    {course.credits ?? "—"} Credits
                  </Badge>

                  <Badge
                    colorPalette="blue"
                    variant="subtle"
                  >
                    {course.courseType || "Core"}
                  </Badge>
                </Flex>
              </Box>

              <Flex
                gap={2}
                pb={3}
                borderBottomWidth="1px"
                borderColor="var(--public-border)"
              >
                <Button
                  size="sm"
                  colorPalette="blue"
                  variant={
                    tab === "overview"
                      ? "solid"
                      : "outline"
                  }
                  onClick={() =>
                    setTab("overview")
                  }
                >
                  Overview
                </Button>

                <Button
                  size="sm"
                  colorPalette="blue"
                  variant={
                    tab === "lessons"
                      ? "solid"
                      : "outline"
                  }
                  onClick={() =>
                    setTab("lessons")
                  }
                >
                  Lessons
                </Button>
              </Flex>

              {tab === "overview" ? (
                <Box
                  bg="var(--public-surface)"
                  borderWidth="1px"
                  borderColor="var(--public-border)"
                  borderRadius="2xl"
                  p={{ base: 6, md: 8 }}
                >
                  <Heading size="md">
                    Course Overview
                  </Heading>

                  <Text
                    mt={4}
                    color="var(--public-muted)"
                    lineHeight="1.9"
                  >
                    {course.description ||
                      "Course details are being prepared."}
                  </Text>

                  <Flex
                    gap={8}
                    wrap="wrap"
                    mt={6}
                  >
                    {[
                      [
                        "Credits",
                        course.credits,
                      ],
                      [
                        "Lecture Hours",
                        course.lectureHours,
                      ],
                      [
                        "Practical Hours",
                        course.practicalHours,
                      ],
                    ].map(
                      ([label, value]) => (
                        <Box key={label}>
                          <Text
                            fontSize="xs"
                            color="var(--public-muted)"
                          >
                            {label}
                          </Text>
                          <Text
                            mt={1}
                            fontWeight="bold"
                          >
                            {value ?? "—"}
                          </Text>
                        </Box>
                      )
                    )}
                  </Flex>

                  <Button
                    mt={8}
                    colorPalette="blue"
                    onClick={() =>
                      setTab("lessons")
                    }
                  >
                    <FiBookOpen />
                    Explore Lessons
                  </Button>
                </Box>
              ) : (
                <Box
                  bg="var(--public-surface)"
                  borderWidth="1px"
                  borderColor="var(--public-border)"
                  borderRadius="2xl"
                  p={{ base: 5, md: 7 }}
                >
                  <Flex
                    justify="space-between"
                    align="center"
                    mb={6}
                  >
                    <Heading size="md">
                      Course Learning
                    </Heading>

                    <Badge
                      colorPalette="blue"
                      variant="subtle"
                    >
                      {lessons.length} Lessons
                    </Badge>
                  </Flex>

                  {lessonsLoading ? (
                    <Flex
                      justify="center"
                      py={12}
                    >
                      <Spinner />
                    </Flex>
                  ) : lessonsError ? (
                    <CourseStatus
                      title="Learning Access Restricted"
                      message={lessonsError}
                    />
                  ) : lessons.length === 0 ? (
                    <Text
                      color="var(--public-muted)"
                      textAlign="center"
                      py={12}
                    >
                      No accessible lessons are
                      available for this course yet.
                    </Text>
                  ) : (
                    <Flex
                      direction={{
                        base: "column",
                        lg: "row",
                      }}
                      gap={6}
                    >
                      <Box
                        flex="1 1 65%"
                        minW={0}
                      >
                        <Box
                          bg="#162238"
                          borderRadius="xl"
                          overflow="hidden"
                          minH={{
                            base: "220px",
                            md: "300px",
                          }}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          {activeLessonId ? (
                            <Box
                              width="100%"
                              p={3}
                              color="white"
                            >
                              <SecureLessonVideoPlayer
                                playback={playback}
                                loading={playbackLoading}
                                error={playbackError}
                                onRetry={() =>
                                  setRefreshKey(
                                    (value) =>
                                      value + 1
                                  )
                                }
                              />
                            </Box>
                          ) : (
                            <Text
                              color="white"
                              textAlign="center"
                              p={5}
                            >
                              Select a lesson to
                              start learning
                            </Text>
                          )}
                        </Box>

                        {activeLesson && (
                          <Box mt={5}>
                            <Heading size="md">
                              {activeLesson.title}
                            </Heading>

                            {activeLesson.description && (
                              <Text
                                mt={2}
                                color="var(--public-muted)"
                              >
                                {activeLesson.description}
                              </Text>
                            )}
                          </Box>
                        )}
                      </Box>

                      <Box
                        flex="1 1 35%"
                        minW={0}
                      >
                        <Heading
                          size="sm"
                          mb={4}
                        >
                          Lesson Playlist
                        </Heading>

                        <Box
                          maxH={{
                            base: "none",
                            lg: "520px",
                          }}
                          overflowY="auto"
                        >
                          <CourseLearningPlaylist
                            lessons={lessons}
                            activeLessonId={activeLessonId}
                            onSelect={
                              setActiveLessonId
                            }
                          />
                        </Box>
                      </Box>
                    </Flex>
                  )}
                </Box>
              )}
            </VStack>
          )}
        </Container>
      </Box>
    </>
  );
}
