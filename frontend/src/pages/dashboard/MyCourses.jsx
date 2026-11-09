
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Badge,
  Box,
  Button,
  Card,
  Drawer,
  Flex,
  Heading,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useOutletContext } from "react-router-dom";

import {
  courseAccessService,
} from "../../services/courseAccess.service.js";

import { coursePlaybackService } from "../../services/coursePlayback.service.js";
import SecureLessonVideoPlayer from "../../components/dashboard/academic/SecureLessonVideoPlayer.jsx";
import CourseLessonPlaylist from "../../components/dashboard/academic/CourseLessonPlaylist.jsx";

// ==================================================
// HELPERS
// ==================================================

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to load course information."
  );
};

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const getStudentName = (student) => {
  return (
    [
      student?.firstName,
      student?.lastName,
    ]
      .filter(Boolean)
      .join(" ") || "Unknown Student"
  );
};

// ==================================================
// COURSE CARD
// ==================================================

function CourseCard({
  course,
  assignmentId,
  isTeacher,
  rosterOnly,
  expanded,
  students,
  rosterLoading,
  rosterError,
  onToggleRoster,
  onOpenLessons,
}) {
  if (!course) return null;

  return (
    <Card.Root
      borderWidth="1px"
      borderRadius="xl"
      overflow="hidden"
    >
      <Card.Header>
        <Flex
          align="flex-start"
          justify="space-between"
          gap={3}
          wrap="wrap"
        >
          <Box>
            <HStack gap={2} mb={2}>
              <Badge colorPalette="blue">
                {course.code || "COURSE"}
              </Badge>

              {isTeacher && (
                <Badge colorPalette="purple">
                  Teaching
                </Badge>
              )}
            </HStack>

            <Heading size="md">
              {course.title || "Untitled Course"}
            </Heading>
          </Box>

          {course.credits !== undefined &&
            course.credits !== null && (
              <Badge variant="outline">
                {course.credits} Credits
              </Badge>
            )}
        </Flex>
      </Card.Header>

      <Card.Body>
        <VStack align="stretch" gap={4}>
          {!rosterOnly && (
            <Text
              color="fg.muted"
              fontSize="sm"
              lineHeight="tall"
            >
              {course.description ||
                "No course description available."}
            </Text>
          )}

          {!rosterOnly && (
            <Button size="sm" colorPalette="blue" variant="outline" alignSelf="flex-start" onClick={() => onOpenLessons(course)}>
              Watch Lessons
            </Button>
          )}

          {isTeacher && assignmentId && (
            <Button
              size="sm"
              variant="outline"
              alignSelf="flex-start"
              onClick={() =>
                onToggleRoster(assignmentId)
              }
            >
              {expanded
                ? "Hide Students"
                : "View Students"}
            </Button>
          )}

          {expanded && isTeacher && (
            <Box
              borderTopWidth="1px"
              pt={4}
            >
              <Heading size="sm" mb={3}>
                Assigned Students
              </Heading>

              {rosterLoading ? (
                <Flex
                  align="center"
                  gap={2}
                  py={3}
                >
                  <Spinner size="sm" />

                  <Text fontSize="sm">
                    Loading students...
                  </Text>
                </Flex>
              ) : rosterError ? (
                <Text color="red.500" fontSize="sm">
                  {rosterError}
                </Text>
              ) : students.length === 0 ? (
                <Text
                  color="fg.muted"
                  fontSize="sm"
                >
                  No students assigned to this course.
                </Text>
              ) : (
                <VStack
                  align="stretch"
                  gap={2}
                >
                  {students.map((student) => (
                    <Flex
                      key={student._id}
                      align="center"
                      justify="space-between"
                      gap={3}
                      borderWidth="1px"
                      borderRadius="md"
                      p={3}
                    >
                      <Box>
                        <Text
                          fontWeight="medium"
                          fontSize="sm"
                        >
                          {getStudentName(student)}
                        </Text>

                        <Text
                          color="fg.muted"
                          fontSize="xs"
                        >
                          {student.studentId ||
                            "Student ID unavailable"}
                        </Text>
                      </Box>

                      <Badge colorPalette="green">
                        Assigned
                      </Badge>
                    </Flex>
                  ))}
                </VStack>
              )}
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

// ==================================================
// MAIN COMPONENT
// ==================================================

export default function MyCourses({
  rosterOnly = false,
}) {
  // ==================================================
  // AUTHENTICATED USER
  // ==================================================

  const context = useOutletContext();

  const user = context?.user;

  const role = user?.role;

  const isTeacher = role === "teacher";
  const isStudent = role === "student";

  // ==================================================
  // COURSES STATE
  // ==================================================

  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  // ==================================================
  // ROSTER STATE
  // ==================================================

  const [expandedAssignmentId, setExpandedAssignmentId] =
    useState(null);

  const [rosters, setRosters] = useState({});

  const [rosterLoadingId, setRosterLoadingId] =
    useState(null);

  const [rosterErrors, setRosterErrors] =
    useState({});

  // ==================================================
  // SECURE COURSE LESSON PLAYBACK
  // ==================================================

  const [lessonCourse, setLessonCourse] = useState(null);
  const [courseLessons, setCourseLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState("");
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [playback, setPlayback] = useState(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [playbackRefreshKey, setPlaybackRefreshKey] = useState(0);

  const closeLessonPlayer = () => {
    setLessonCourse(null);
    setCourseLessons([]);
    setActiveLessonId(null);
    setPlayback(null);
    setLessonsError("");
    setPlaybackError("");
  };

  useEffect(() => {
    if (!lessonCourse?._id) return;
    const controller = new AbortController();
    setLessonsLoading(true);
    setLessonsError("");
    setCourseLessons([]);
    setActiveLessonId(null);
    setPlayback(null);

    coursePlaybackService.listAccessible(lessonCourse._id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result?.lessons)
            ? result.lessons
            : [];
        setCourseLessons(list);
      })
      .catch((err) => {
        if (!controller.signal.aborted && !isCanceledRequest(err)) {
          setLessonsError(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLessonsLoading(false);
      });

    return () => controller.abort();
  }, [lessonCourse?._id]);

  useEffect(() => {
    if (!lessonCourse?._id || !activeLessonId) return;
    const controller = new AbortController();
    setPlaybackLoading(true);
    setPlayback(null);
    setPlaybackError("");

    coursePlaybackService.getPlayback(lessonCourse._id, activeLessonId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setPlayback(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted && !isCanceledRequest(err)) {
          setPlaybackError(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPlaybackLoading(false);
      });

    return () => controller.abort();
  }, [lessonCourse?._id, activeLessonId, playbackRefreshKey]);

  // ==================================================
  // LOAD COURSES
  // ==================================================

  useEffect(() => {
    if (!isTeacher && !isStudent) {
      setCourses([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadCourses = async () => {
      setLoading(true);
      setError("");

      try {
        const result = isTeacher
          ? await courseAccessService.getTeacherCourses(
              controller.signal,
            )
          : await courseAccessService.getStudentCourses(
              controller.signal,
            );

        if (controller.signal.aborted) return;

        setCourses(
          Array.isArray(result) ? result : [],
        );

        setExpandedAssignmentId(null);
        setRosters({});
        setRosterErrors({});
      } catch (err) {
        if (
          controller.signal.aborted ||
          isCanceledRequest(err)
        ) {
          return;
        }

        setCourses([]);
        setError(getErrorMessage(err));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadCourses();

    return () => controller.abort();
  }, [isTeacher, isStudent, reloadKey]);

  // ==================================================
  // REFRESH
  // ==================================================

  const refreshCourses = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  // ==================================================
  // NORMALIZE COURSE RECORDS
  // ==================================================

  const normalizedCourses = useMemo(() => {
    if (isTeacher) {
      return courses
        .filter((entry) => entry?.course)
        .map((entry) => ({
          assignmentId: entry.assignmentId,
          course: entry.course,
        }));
    }

    return courses
      .filter(Boolean)
      .map((course) => ({
        assignmentId: null,
        course,
      }));
  }, [courses, isTeacher]);

  // ==================================================
  // SEARCH
  // ==================================================

  const filteredCourses = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) return normalizedCourses;

    return normalizedCourses.filter(
      ({ course }) => {
        const text = [
          course?.code,
          course?.title,
          course?.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(keyword);
      },
    );
  }, [normalizedCourses, search]);

  // ==================================================
  // LOAD STUDENT ROSTER
  // ==================================================

  const handleToggleRoster = useCallback(
    async (assignmentId) => {
      if (!isTeacher || !assignmentId) return;

      if (expandedAssignmentId === assignmentId) {
        setExpandedAssignmentId(null);
        return;
      }

      setExpandedAssignmentId(assignmentId);

      // Reuse already fetched roster.

      if (Object.prototype.hasOwnProperty.call(
        rosters,
        assignmentId,
      )) {
        return;
      }

      setRosterLoadingId(assignmentId);

      setRosterErrors((previous) => ({
        ...previous,
        [assignmentId]: "",
      }));

      try {
        const students =
          await courseAccessService
            .getTeacherCourseStudents(
              assignmentId,
            );

        setRosters((previous) => ({
          ...previous,
          [assignmentId]: students,
        }));
      } catch (err) {
        setRosterErrors((previous) => ({
          ...previous,
          [assignmentId]:
            getErrorMessage(err),
        }));
      } finally {
        setRosterLoadingId(null);
      }
    },
    [
      isTeacher,
      expandedAssignmentId,
      rosters,
    ],
  );

  // ==================================================
  // PAGE TITLE
  // ==================================================

  const pageTitle = rosterOnly
    ? "My Students"
    : "My Courses";

  const pageDescription = rosterOnly
    ? "View students enrolled in your assigned courses."
    : isTeacher
      ? "View courses assigned to you and manage student rosters."
      : "View the courses assigned to your account.";

  // ==================================================
  // ROLE VALIDATION
  // ==================================================

  if (!isTeacher && !isStudent) {
    return (
      <Box p={6}>
        <Heading size="md">
          Access Denied
        </Heading>

        <Text color="fg.muted" mt={2}>
          This page is available only to teachers
          and students.
        </Text>
      </Box>
    );
  }

  if (rosterOnly && !isTeacher) {
    return (
      <Box p={6}>
        <Heading size="md">
          Access Denied
        </Heading>

        <Text color="fg.muted" mt={2}>
          Student rosters are available only
          to assigned teachers.
        </Text>
      </Box>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <VStack
      align="stretch"
      gap={6}
    >
      {/* ========================================== */}
      {/* HEADER */}
      {/* ========================================== */}

      <Flex
        justify="space-between"
        align="center"
        gap={4}
        wrap="wrap"
      >
        <Box>
          <Heading size="xl">
            {pageTitle}
          </Heading>

          <Text
            color="fg.muted"
            fontSize="sm"
            mt={1}
          >
            {pageDescription}
          </Text>
        </Box>

        <Button
          variant="outline"
          onClick={refreshCourses}
          disabled={loading}
        >
          Refresh
        </Button>
      </Flex>

      {/* ========================================== */}
      {/* ERROR */}
      {/* ========================================== */}

      {error && (
        <Box
          borderWidth="1px"
          borderColor="red.400"
          borderRadius="md"
          p={4}
        >
          <Text color="red.500">
            {error}
          </Text>
        </Box>
      )}

      {/* ========================================== */}
      {/* SUMMARY */}
      {/* ========================================== */}

      <Card.Root>
        <Card.Body>
          <Flex
            align="center"
            justify="space-between"
            gap={3}
            wrap="wrap"
          >
            <Box>
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                {isTeacher
                  ? "Assigned Course Records"
                  : "My Assigned Courses"}
              </Text>

              <Heading size="2xl" mt={1}>
                {normalizedCourses.length}
              </Heading>
            </Box>

            <Badge
              colorPalette={
                isTeacher ? "purple" : "blue"
              }
              size="lg"
            >
              {isTeacher
                ? "Teacher"
                : "Student"}
            </Badge>
          </Flex>
        </Card.Body>
      </Card.Root>

      {/* ========================================== */}
      {/* SEARCH */}
      {/* ========================================== */}

      <Input
        placeholder="Search courses by code, title or description..."
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
      />

      {/* ========================================== */}
      {/* COURSES */}
      {/* ========================================== */}

      {loading ? (
        <Flex
          align="center"
          justify="center"
          py={12}
          gap={3}
        >
          <Spinner size="lg" />

          <Text color="fg.muted">
            Loading courses...
          </Text>
        </Flex>
      ) : filteredCourses.length === 0 ? (
        <Card.Root>
          <Card.Body py={10}>
            <VStack gap={3}>
              <Heading size="md">
                No Courses Found
              </Heading>

              <Text
                textAlign="center"
                color="fg.muted"
                fontSize="sm"
              >
                {search
                  ? "No courses match your search."
                  : "No courses have been assigned to your account yet."}
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        <Box
          display="grid"
          gridTemplateColumns={{
            base: "1fr",
            xl: "repeat(2, minmax(0, 1fr))",
          }}
          gap={5}
        >
          {filteredCourses.map(
            ({ assignmentId, course }) => (
              <CourseCard
                key={
                  assignmentId ||
                  course._id
                }
                course={course}
                assignmentId={assignmentId}
                isTeacher={isTeacher}
                rosterOnly={rosterOnly}
                expanded={
                  expandedAssignmentId ===
                  assignmentId
                }
                students={
                  rosters[assignmentId] || []
                }
                rosterLoading={
                  rosterLoadingId ===
                  assignmentId
                }
                rosterError={
                  rosterErrors[assignmentId] || ""
                }
                onToggleRoster={
                  handleToggleRoster
                }
                onOpenLessons={setLessonCourse}
              />
            ),
          )}
        </Box>
      )}
      {/* Secure lesson playback — URL is issued by backend after authorization. */}
      <Drawer.Root
        open={Boolean(lessonCourse)}
        onOpenChange={(details) => {
          if (!details.open) closeLessonPlayer();
        }}
        placement="end"
        size="lg"
      >
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>
                {lessonCourse?.code ? `${lessonCourse.code} — ` : ""}
                {lessonCourse?.title || "Course Lessons"}
              </Drawer.Title>
            </Drawer.Header>
            <Drawer.Body>
              <VStack align="stretch" gap={4}>
                {lessonsLoading ? (
                  <Flex gap={2} align="center" py={4}>
                    <Spinner size="sm" />
                    <Text>Loading lessons...</Text>
                  </Flex>
                ) : lessonsError ? (
                  <Text color="red.500" role="alert">{lessonsError}</Text>
                ) : courseLessons.length === 0 ? (
                  <Text color="fg.muted">No published lessons with videos are available.</Text>
                ) : (
                  <CourseLessonPlaylist
                    lessons={courseLessons}
                    activeLessonId={activeLessonId}
                    onSelect={(lesson) => {
                      const id = String(lesson.id || lesson._id);
                      if (String(activeLessonId) === id) {
                        setActiveLessonId(null);
                        setPlayback(null);
                        setPlaybackError("");
                        return;
                      }
                      setActiveLessonId(id);
                    }}
                    renderPlayer={() => (
                      <Box borderWidth="1px" borderRadius="lg" p={3}>
                        <SecureLessonVideoPlayer
                          playback={playback}
                          loading={playbackLoading}
                          error={playbackError}
                          onRetry={() => setPlaybackRefreshKey((key) => key + 1)}
                        />
                        <Button
                          size="xs"
                          variant="outline"
                          mt={3}
                          onClick={() => {
                            setActiveLessonId(null);
                            setPlayback(null);
                            setPlaybackError("");
                          }}
                        >
                          Close Video
                        </Button>
                      </Box>
                    )}
                  />
                )}
              </VStack>
            </Drawer.Body>
            <Drawer.Footer>
              <Button variant="outline" onClick={closeLessonPlayer}>Close</Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </VStack>
  );
}
