
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

import {
  coursePlaybackService,
} from "../../services/coursePlayback.service.js";

import {
  courseLessonService,
} from "../../services/courseLesson.service.js";

import SecureLessonVideoPlayer from "../../components/dashboard/academic/SecureLessonVideoPlayer.jsx";

import CourseLessonPlaylist from "../../components/dashboard/academic/CourseLessonPlaylist.jsx";

import CourseVideoUploader from "../../components/dashboard/academic/CourseVideoUploader.jsx";

// ==================================================
// HELPERS
// ==================================================

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to complete the request.";

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

const getStudentName = (student) =>
  [student?.firstName, student?.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown Student";

const emptyLessonForm = () => ({
  title: "",
  description: "",
  order: 1,
});

const getCourseId = (course) =>
  course?._id || course?.id;

const getLessonId = (lesson) =>
  lesson?._id || lesson?.id;

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
  onManageLessons,
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
            <HStack gap={2} flexWrap="wrap">
              <Button
                size="sm"
                colorPalette="blue"
                variant="outline"
                onClick={() => onOpenLessons(course)}
              >
                Watch Lessons
              </Button>

              {isTeacher && (
                <Button
                  size="sm"
                  colorPalette="blue"
                  onClick={() =>
                    onManageLessons(course)
                  }
                >
                  Manage Lessons
                </Button>
              )}
            </HStack>
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
                <Text
                  color="red.500"
                  fontSize="sm"
                >
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
  const context = useOutletContext();
  const user = context?.user;

  const role = user?.role;
  const isTeacher = role === "teacher";
  const isStudent = role === "student";

  // ==================================================
  // COURSE STATE
  // ==================================================

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // ==================================================
  // STUDENT ROSTER STATE
  // ==================================================

  const [
    expandedAssignmentId,
    setExpandedAssignmentId,
  ] = useState(null);

  const [rosters, setRosters] = useState({});
  const [rosterLoadingId, setRosterLoadingId] =
    useState(null);

  const [rosterErrors, setRosterErrors] =
    useState({});

  // ==================================================
  // SECURE PLAYBACK STATE
  // ==================================================

  const [lessonCourse, setLessonCourse] =
    useState(null);

  const [courseLessons, setCourseLessons] =
    useState([]);

  const [lessonsLoading, setLessonsLoading] =
    useState(false);

  const [lessonsError, setLessonsError] =
    useState("");

  const [activeLessonId, setActiveLessonId] =
    useState(null);

  const [playback, setPlayback] = useState(null);

  const [playbackLoading, setPlaybackLoading] =
    useState(false);

  const [playbackError, setPlaybackError] =
    useState("");

  const [
    playbackRefreshKey,
    setPlaybackRefreshKey,
  ] = useState(0);

  // ==================================================
  // TEACHER LESSON MANAGEMENT STATE
  // ==================================================

  const [manageCourse, setManageCourse] =
    useState(null);

  const [managedLessons, setManagedLessons] =
    useState([]);

  const [manageLoading, setManageLoading] =
    useState(false);

  const [manageBusy, setManageBusy] =
    useState(false);

  const [videoUploading, setVideoUploading] =
    useState(false);

  const [manageError, setManageError] =
    useState("");

  const [manageSuccess, setManageSuccess] =
    useState("");

  const [lessonForm, setLessonForm] =
    useState(emptyLessonForm);

  const [editingLessonId, setEditingLessonId] =
    useState(null);

  // ==================================================
  // CLOSE SECURE LESSON PLAYER
  // ==================================================

  const closeLessonPlayer = () => {
    setLessonCourse(null);
    setCourseLessons([]);
    setActiveLessonId(null);
    setPlayback(null);
    setLessonsError("");
    setPlaybackError("");
  };

  // ==================================================
  // LOAD ACCESSIBLE LESSONS
  // ==================================================

  useEffect(() => {
    if (!lessonCourse?._id) return;

    const controller = new AbortController();

    setLessonsLoading(true);
    setLessonsError("");
    setCourseLessons([]);
    setActiveLessonId(null);
    setPlayback(null);

    coursePlaybackService
      .listAccessible(
        lessonCourse._id,
        controller.signal
      )
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
        if (
          !controller.signal.aborted &&
          !isCanceledRequest(err)
        ) {
          setLessonsError(
            getErrorMessage(err)
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLessonsLoading(false);
        }
      });

    return () => controller.abort();
  }, [lessonCourse?._id]);

  // ==================================================
  // LOAD SECURE VIDEO PLAYBACK
  // ==================================================

  useEffect(() => {
    if (
      !lessonCourse?._id ||
      !activeLessonId
    ) {
      return;
    }

    const controller = new AbortController();

    setPlaybackLoading(true);
    setPlayback(null);
    setPlaybackError("");

    coursePlaybackService
      .getPlayback(
        lessonCourse._id,
        activeLessonId,
        controller.signal
      )
      .then((result) => {
        if (!controller.signal.aborted) {
          setPlayback(result);
        }
      })
      .catch((err) => {
        if (
          !controller.signal.aborted &&
          !isCanceledRequest(err)
        ) {
          setPlaybackError(
            getErrorMessage(err)
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
    lessonCourse?._id,
    activeLessonId,
    playbackRefreshKey,
  ]);

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
              controller.signal
            )
          : await courseAccessService.getStudentCourses(
              controller.signal
            );

        if (controller.signal.aborted) return;

        setCourses(
          Array.isArray(result) ? result : []
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
  }, [
    isTeacher,
    isStudent,
    reloadKey,
  ]);

  // ==================================================
  // REFRESH COURSES
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
  // SEARCH COURSES
  // ==================================================

  const filteredCourses = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return normalizedCourses;
    }

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
      }
    );
  }, [
    normalizedCourses,
    search,
  ]);

  // ==================================================
  // LOAD STUDENT ROSTER
  // ==================================================

  const handleToggleRoster = useCallback(
    async (assignmentId) => {
      if (!isTeacher || !assignmentId) {
        return;
      }

      if (
        expandedAssignmentId === assignmentId
      ) {
        setExpandedAssignmentId(null);
        return;
      }

      setExpandedAssignmentId(assignmentId);

      if (
        Object.prototype.hasOwnProperty.call(
          rosters,
          assignmentId
        )
      ) {
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
              assignmentId
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
    ]
  );

  // ==================================================
  // LOAD MANAGED LESSONS
  // ==================================================

  const loadManagedLessons = useCallback(
    async (courseId, { clearOnError = false } = {}) => {
      if (!courseId) return false;

      setManageLoading(true);
      setManageError("");

      try {
        const allLessons = [];
        const pageSize = 100;
        let page = 1;
        let totalPages = 1;

        do {
          const result = await courseLessonService.list(courseId, {
            page,
            limit: pageSize,
          });

          if (!Array.isArray(result?.lessons)) {
            throw new Error("Unexpected lesson list response.");
          }

          allLessons.push(...result.lessons);

          const reportedPages = Number(result?.pagination?.totalPages);
          if (!Number.isSafeInteger(reportedPages) || reportedPages < 0) {
            throw new Error("Invalid lesson pagination response.");
          }
          totalPages = reportedPages;
          page += 1;
        } while (page <= totalPages);

        setManagedLessons(allLessons);
        return true;
      } catch (err) {
        if (clearOnError) setManagedLessons([]);
        setManageError(getErrorMessage(err));
        return false;
      } finally {
        setManageLoading(false);
      }
    },
    []
  );

  // ==================================================
  // OPEN LESSON MANAGER
  // ==================================================

  const openLessonManager = async (course) => {
    if (
      !isTeacher ||
      rosterOnly ||
      !getCourseId(course)
    ) {
      return;
    }

    setManageCourse(course);
    setManagedLessons([]);
    setEditingLessonId(null);
    setLessonForm(emptyLessonForm());
    setManageError("");
    setManageSuccess("");

    await loadManagedLessons(
      getCourseId(course),
      { clearOnError: true }
    );
  };

  // ==================================================
  // CLOSE LESSON MANAGER
  // ==================================================

  const closeLessonManager = () => {
    if (manageBusy || videoUploading) return;

    setManageCourse(null);
    setManagedLessons([]);
    setEditingLessonId(null);
    setLessonForm(emptyLessonForm());
    setManageError("");
    setManageSuccess("");
  };

  // ==================================================
  // SAVE LESSON
  // ==================================================

  const saveLesson = async () => {
    const courseId =
      getCourseId(manageCourse);

    if (
      !isTeacher ||
      !courseId ||
      manageBusy ||
      videoUploading
    ) {
      return;
    }

    const title = lessonForm.title.trim();

    const order = Number(
      lessonForm.order
    );

    if (title.length < 2 || title.length > 200) {
      setManageError(
        "Lesson title must contain 2–200 characters."
      );
      return;
    }

    if (lessonForm.description.trim().length > 5000) {
      setManageError(
        "Lesson description cannot exceed 5000 characters."
      );
      return;
    }

    if (
      !Number.isSafeInteger(order) ||
      order < 1
    ) {
      setManageError(
        "Lesson order must be a positive integer."
      );
      return;
    }

    setManageBusy(true);
    setManageError("");
    setManageSuccess("");

    try {
      const payload = {
        title,
        description:
          lessonForm.description.trim(),
        order,
      };

      if (editingLessonId) {
        await courseLessonService.update(
          courseId,
          editingLessonId,
          payload
        );

        setManageSuccess(
          "Lesson updated successfully."
        );
      } else {
        await courseLessonService.create(
          courseId,
          payload
        );

        setManageSuccess(
          "Lesson created successfully."
        );
      }

      setEditingLessonId(null);
      setLessonForm(emptyLessonForm());

      const refreshed = await loadManagedLessons(courseId);
      if (!refreshed) {
        setManageError("Lesson saved, but refreshing the list failed. Retry loading lessons.");
      }
    } catch (err) {
      setManageError(
        getErrorMessage(err)
      );
    } finally {
      setManageBusy(false);
    }
  };

  // ==================================================
  // EDIT LESSON
  // ==================================================

  const startEditingLesson = (lesson) => {
    setEditingLessonId(
      getLessonId(lesson)
    );

    setLessonForm({
      title: lesson.title || "",
      description:
        lesson.description || "",
      order: lesson.order ?? 1,
    });

    setManageError("");
    setManageSuccess("");
  };

  const cancelEditingLesson = () => {
    setEditingLessonId(null);
    setLessonForm(emptyLessonForm());
  };

  // ==================================================
  // PUBLISH / UNPUBLISH
  // ==================================================

  const changeLessonPublication = async (
    lesson
  ) => {
    const courseId =
      getCourseId(manageCourse);

    const lessonId =
      getLessonId(lesson);

    if (
      !courseId ||
      !lessonId ||
      manageBusy ||
      videoUploading
    ) {
      return;
    }

    setManageBusy(true);
    setManageError("");
    setManageSuccess("");

    try {
      await courseLessonService.setPublication(
        courseId,
        lessonId,
        !lesson.isPublished
      );

      const refreshed = await loadManagedLessons(courseId);
      if (!refreshed) {
        setManageError("Action succeeded, but refreshing lessons failed. Retry loading lessons.");
      }

      setManageSuccess(
        lesson.isPublished
          ? "Lesson unpublished successfully."
          : "Lesson published successfully."
      );
    } catch (err) {
      setManageError(
        getErrorMessage(err)
      );
    } finally {
      setManageBusy(false);
    }
  };

  // ==================================================
  // DETACH LESSON VIDEO
  // ==================================================

  const detachManagedVideo = async (
    lesson
  ) => {
    const courseId =
      getCourseId(manageCourse);

    const lessonId =
      getLessonId(lesson);

    if (
      !courseId ||
      !lessonId ||
      manageBusy ||
      videoUploading
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Detach this video? The lesson will also be unpublished."
    );

    if (!confirmed) return;

    setManageBusy(true);
    setManageError("");
    setManageSuccess("");

    try {
      await courseLessonService.detachVideo(
        courseId,
        lessonId
      );

      const refreshed = await loadManagedLessons(courseId);
      if (!refreshed) {
        setManageError("Action succeeded, but refreshing lessons failed. Retry loading lessons.");
      }

      setManageSuccess(
        "Video detached successfully."
      );
    } catch (err) {
      setManageError(
        getErrorMessage(err)
      );
    } finally {
      setManageBusy(false);
    }
  };

  // ==================================================
  // DELETE LESSON
  // ==================================================

  const deleteManagedLesson = async (
    lesson
  ) => {
    const courseId =
      getCourseId(manageCourse);

    const lessonId =
      getLessonId(lesson);

    if (
      !courseId ||
      !lessonId ||
      manageBusy ||
      videoUploading
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Delete lesson "${lesson.title}"?`
    );

    if (!confirmed) return;

    setManageBusy(true);
    setManageError("");
    setManageSuccess("");

    try {
      await courseLessonService.remove(
        courseId,
        lessonId
      );

      if (
        String(editingLessonId) ===
        String(lessonId)
      ) {
        cancelEditingLesson();
      }

      const refreshed = await loadManagedLessons(courseId);
      if (!refreshed) {
        setManageError("Action succeeded, but refreshing lessons failed. Retry loading lessons.");
      }

      setManageSuccess(
        "Lesson deleted successfully."
      );
    } catch (err) {
      setManageError(
        getErrorMessage(err)
      );
    } finally {
      setManageBusy(false);
    }
  };

  // ==================================================
  // VIDEO UPLOAD SUCCESS
  // ==================================================

  const handleVideoUploaded = async () => {
    const courseId =
      getCourseId(manageCourse);

    if (!courseId) return;

    const refreshed = await loadManagedLessons(courseId);
    setManageSuccess(
      refreshed
        ? "Video uploaded successfully. Publish the lesson when ready."
        : "Video uploaded successfully, but the lesson list could not be refreshed."
    );
  };

  // ==================================================
  // PAGE TITLE
  // ==================================================

  const pageTitle = rosterOnly
    ? "My Students"
    : "My Courses";

  const pageDescription = rosterOnly
    ? "View students enrolled in your assigned courses."
    : isTeacher
      ? "View assigned courses, manage lessons, upload videos and view student rosters."
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
          This page is available only to
          teachers and students.
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
          Student rosters are available
          only to assigned teachers.
        </Text>
      </Box>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <VStack align="stretch" gap={6}>
      {/* HEADER */}

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

      {/* COURSE ERROR */}

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

      {/* SUMMARY */}

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

      {/* SEARCH */}

      <Input
        placeholder="Search courses by code, title or description..."
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
      />

      {/* COURSES */}

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
                  getCourseId(course)
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
                onOpenLessons={
                  setLessonCourse
                }
                onManageLessons={
                  openLessonManager
                }
              />
            )
          )}
        </Box>
      )}

      {/* ====================================== */}
      {/* SECURE LESSON PLAYBACK DRAWER */}
      {/* ====================================== */}

      <Drawer.Root
        open={Boolean(lessonCourse)}
        onOpenChange={(details) => {
          if (!details.open) {
            closeLessonPlayer();
          }
        }}
        placement="end"
        size="lg"
      >
        <Drawer.Backdrop />

        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>
                {lessonCourse?.code
                  ? `${lessonCourse.code} — `
                  : ""}
                {lessonCourse?.title ||
                  "Course Lessons"}
              </Drawer.Title>
            </Drawer.Header>

            <Drawer.Body>
              <VStack
                align="stretch"
                gap={4}
              >
                {lessonsLoading ? (
                  <Flex
                    gap={2}
                    align="center"
                    py={4}
                  >
                    <Spinner size="sm" />

                    <Text>
                      Loading lessons...
                    </Text>
                  </Flex>
                ) : lessonsError ? (
                  <Text
                    color="red.500"
                    role="alert"
                  >
                    {lessonsError}
                  </Text>
                ) : courseLessons.length === 0 ? (
                  <Text color="fg.muted">
                    No published lessons with videos
                    are available.
                  </Text>
                ) : (
                  <CourseLessonPlaylist
                    lessons={courseLessons}
                    activeLessonId={
                      activeLessonId
                    }
                    onSelect={(lesson) => {
                      const id = String(
                        getLessonId(lesson)
                      );

                      if (
                        String(activeLessonId) ===
                        id
                      ) {
                        setActiveLessonId(null);
                        setPlayback(null);
                        setPlaybackError("");
                        return;
                      }

                      setActiveLessonId(id);
                    }}
                    renderPlayer={() => (
                      <Box
                        borderWidth="1px"
                        borderRadius="lg"
                        p={3}
                      >
                        <SecureLessonVideoPlayer
                          playback={playback}
                          loading={
                            playbackLoading
                          }
                          error={
                            playbackError
                          }
                          onRetry={() =>
                            setPlaybackRefreshKey(
                              (key) => key + 1
                            )
                          }
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
              <Button
                variant="outline"
                onClick={
                  closeLessonPlayer
                }
              >
                Close
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>

      {/* ====================================== */}
      {/* TEACHER LESSON MANAGEMENT DRAWER */}
      {/* ====================================== */}

      {isTeacher && !rosterOnly && (
        <Drawer.Root
          open={Boolean(manageCourse)}
          onOpenChange={(details) => {
            if (!details.open) {
              closeLessonManager();
            }
          }}
          placement="end"
          size="lg"
        >
          <Drawer.Backdrop />

          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>
                  Manage Lessons
                  {manageCourse?.code
                    ? ` — ${manageCourse.code}`
                    : ""}
                </Drawer.Title>
              </Drawer.Header>

              <Drawer.Body>
                <VStack
                  align="stretch"
                  gap={5}
                >
                  {/* COURSE INFORMATION */}

                  <Box>
                    <Heading size="md">
                      {manageCourse?.title ||
                        "Course"}
                    </Heading>

                    <Text
                      fontSize="sm"
                      color="fg.muted"
                      mt={1}
                    >
                      Create, edit, publish and
                      manage lesson videos.
                    </Text>
                  </Box>

                  {/* ERROR */}

                  {manageError && (
                    <Box
                      borderWidth="1px"
                      borderColor="red.400"
                      borderRadius="md"
                      p={3}
                    >
                      <Text
                        color="red.500"
                        fontSize="sm"
                      >
                        {manageError}
                      </Text>
                    </Box>
                  )}

                  {/* SUCCESS */}

                  {manageSuccess && (
                    <Text
                      color="green.500"
                      fontSize="sm"
                    >
                      {manageSuccess}
                    </Text>
                  )}

                  {/* LESSON FORM */}

                  <Card.Root>
                    <Card.Header>
                      <Heading size="sm">
                        {editingLessonId
                          ? "Edit Lesson"
                          : "Create Lesson"}
                      </Heading>
                    </Card.Header>

                    <Card.Body>
                      <VStack
                        align="stretch"
                        gap={3}
                      >
                        <Box>
                          <Text
                            fontSize="sm"
                            mb={2}
                            fontWeight="medium"
                          >
                            Lesson Title
                          </Text>

                          <Input
                            placeholder="Enter lesson title"
                            value={
                              lessonForm.title
                            }
                            onChange={(event) =>
                              setLessonForm(
                                (previous) => ({
                                  ...previous,
                                  title:
                                    event.target.value,
                                })
                              )
                            }
                          />
                        </Box>

                        <Box>
                          <Text
                            fontSize="sm"
                            mb={2}
                            fontWeight="medium"
                          >
                            Description
                          </Text>

                          <Input
                            placeholder="Enter description"
                            value={
                              lessonForm.description
                            }
                            onChange={(event) =>
                              setLessonForm(
                                (previous) => ({
                                  ...previous,
                                  description:
                                    event.target.value,
                                })
                              )
                            }
                          />
                        </Box>

                        <Box>
                          <Text
                            fontSize="sm"
                            mb={2}
                            fontWeight="medium"
                          >
                            Lesson Order
                          </Text>

                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={
                              lessonForm.order
                            }
                            onChange={(event) =>
                              setLessonForm(
                                (previous) => ({
                                  ...previous,
                                  order:
                                    event.target.value,
                                })
                              )
                            }
                          />
                        </Box>

                        <HStack
                          gap={2}
                          flexWrap="wrap"
                        >
                          <Button
                            colorPalette="blue"
                            disabled={
                              manageBusy ||
                              manageLoading
                            }
                            onClick={saveLesson}
                          >
                            {manageBusy
                              ? "Saving..."
                              : editingLessonId
                                ? "Save Changes"
                                : "Create Lesson"}
                          </Button>

                          {editingLessonId && (
                            <Button
                              variant="outline"
                              disabled={manageBusy}
                              onClick={
                                cancelEditingLesson
                              }
                            >
                              Cancel Edit
                            </Button>
                          )}
                        </HStack>
                      </VStack>
                    </Card.Body>
                  </Card.Root>

                  {/* LESSON LIST HEADER */}

                  <Flex
                    align="center"
                    justify="space-between"
                    gap={3}
                  >
                    <Heading size="sm">
                      Course Lessons
                    </Heading>

                    <Button
                      size="xs"
                      variant="outline"
                      disabled={
                        manageLoading ||
                        manageBusy
                      }
                      onClick={() =>
                        loadManagedLessons(
                          getCourseId(
                            manageCourse
                          )
                        )
                      }
                    >
                      Reload Lessons
                    </Button>
                  </Flex>

                  {/* LOADING */}

                  {manageLoading ? (
                    <Flex
                      align="center"
                      gap={2}
                      py={4}
                    >
                      <Spinner size="sm" />

                      <Text fontSize="sm">
                        Loading lessons...
                      </Text>
                    </Flex>
                  ) : managedLessons.length === 0 ? (
                    <Text
                      color="fg.muted"
                      fontSize="sm"
                    >
                      No lessons found. Create
                      your first lesson above.
                    </Text>
                  ) : (
                    <VStack
                      align="stretch"
                      gap={4}
                    >
                      {managedLessons.map(
                        (lesson) => {
                          const lessonId =
                            getLessonId(lesson);

                          const hasVideo =
                            Boolean(
                              lesson.videoMediaId ||
                              lesson.hasVideo
                            );

                          return (
                            <Card.Root
                              key={lessonId}
                              borderWidth="1px"
                              borderRadius="lg"
                            >
                              <Card.Body>
                                <VStack
                                  align="stretch"
                                  gap={3}
                                >
                                  <Flex
                                    justify="space-between"
                                    align="flex-start"
                                    gap={2}
                                  >
                                    <Box flex="1">
                                      <Heading
                                        size="sm"
                                      >
                                        {lesson.order}.
                                        {" "}
                                        {lesson.title}
                                      </Heading>

                                      {lesson.description && (
                                        <Text
                                          fontSize="sm"
                                          color="fg.muted"
                                          mt={2}
                                        >
                                          {lesson.description}
                                        </Text>
                                      )}
                                    </Box>

                                    <Badge
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
                                  </Flex>

                                  <HStack
                                    gap={2}
                                    flexWrap="wrap"
                                  >
                                    <Badge
                                      variant="outline"
                                      colorPalette={
                                        hasVideo
                                          ? "green"
                                          : "orange"
                                      }
                                    >
                                      {hasVideo
                                        ? "Video Attached"
                                        : "No Video"}
                                    </Badge>
                                  </HStack>

                                  {/* CRUD ACTIONS */}

                                  <HStack
                                    gap={2}
                                    flexWrap="wrap"
                                  >
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      disabled={
                                        manageBusy
                                      }
                                      onClick={() =>
                                        startEditingLesson(
                                          lesson
                                        )
                                      }
                                    >
                                      Edit
                                    </Button>

                                    <Button
                                      size="xs"
                                      colorPalette={
                                        lesson.isPublished
                                          ? "orange"
                                          : "green"
                                      }
                                      variant="outline"
                                      disabled={
                                        manageBusy ||
                                        (!lesson.isPublished &&
                                          !hasVideo)
                                      }
                                      onClick={() =>
                                        changeLessonPublication(
                                          lesson
                                        )
                                      }
                                    >
                                      {lesson.isPublished
                                        ? "Unpublish"
                                        : "Publish"}
                                    </Button>

                                    <Button
                                      size="xs"
                                      colorPalette="red"
                                      variant="outline"
                                      disabled={
                                        manageBusy ||
                                        hasVideo
                                      }
                                      onClick={() =>
                                        deleteManagedLesson(
                                          lesson
                                        )
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </HStack>

                                  {/* VIDEO MANAGEMENT */}

                                  <Box
                                    borderTopWidth="1px"
                                    pt={3}
                                  >
                                    <Heading
                                      size="xs"
                                      mb={3}
                                    >
                                      Lesson Video
                                    </Heading>

                                    {hasVideo ? (
                                      <VStack
                                        align="stretch"
                                        gap={2}
                                      >
                                        <Text
                                          color="fg.muted"
                                          fontSize="sm"
                                        >
                                          This lesson has
                                          an attached video.
                                        </Text>

                                        <Button
                                          size="sm"
                                          variant="outline"
                                          colorPalette="red"
                                          alignSelf="flex-start"
                                          disabled={
                                            manageBusy
                                          }
                                          onClick={() =>
                                            detachManagedVideo(
                                              lesson
                                            )
                                          }
                                        >
                                          Detach Video
                                        </Button>

                                        <Text
                                          fontSize="xs"
                                          color="fg.muted"
                                        >
                                          Detach the existing
                                          video before uploading
                                          a replacement.
                                        </Text>
                                      </VStack>
                                    ) : (
                                      <CourseVideoUploader
                                        key={lessonId}
                                        courseId={
                                          getCourseId(
                                            manageCourse
                                          )
                                        }
                                        lessonId={
                                          lessonId
                                        }
                                        disabled={
                                          manageBusy || videoUploading
                                        }
                                        onUploadingChange={
                                          setVideoUploading
                                        }
                                        onUploaded={
                                          handleVideoUploaded
                                        }
                                      />
                                    )}
                                  </Box>
                                </VStack>
                              </Card.Body>
                            </Card.Root>
                          );
                        }
                      )}
                    </VStack>
                  )}
                </VStack>
              </Drawer.Body>

              <Drawer.Footer>
                <Button
                  variant="outline"
                  disabled={manageBusy || videoUploading}
                  onClick={
                    closeLessonManager
                  }
                >
                  Close
                </Button>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Root>
      )}
    </VStack>
  );
}
