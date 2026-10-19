
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
  Flex,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";

import api from "../../api/api.js";

import {
  courseAccessService,
} from "../../services/courseAccess.service.js";

// ==================================================
// CONSTANTS
// ==================================================

const PAGE_SIZE = 10;
const LOOKUP_LIMIT = 100;

const initialTeacherForm = {
  cohortId: "",
  courseId: "",
  teacherId: "",
};
const initialStudentForm = {
  assignmentId: "",
  studentId: "",
};

// ==================================================
// HELPERS
// ==================================================

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong.";

const isAbortError = (error) =>
  error?.name === "AbortError" ||
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

const getId = (value) => {
  if (typeof value === "string") {
    return value;
  }

  return value?._id ?? value?.id ?? "";
};

const getName = (record) => {
  if (!record) return "Unknown";

  if (typeof record === "string") {
    return record;
  }

  const firstName =
    record.firstName ?? record.firstname ?? "";

  const lastName =
    record.lastName ?? record.lastname ?? "";

  const fullName = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    fullName ||
    record.name ||
    record.title ||
    record.code ||
    record.email ||
    record.studentId ||
    record._id ||
    "Unknown"
  );
};

// ==================================================
// FLEXIBLE API RESPONSE EXTRACTION
// ==================================================

// ==================================================
// FLEXIBLE API RESPONSE EXTRACTION
// ==================================================

const extractList = (response, keys = []) => {
  const candidates = [
    response?.data?.data?.data,
    response?.data?.data,
    response?.data,
    response,
  ];

  const possibleKeys = [
    ...keys,
    "data",
    "records",
    "courses",
    "teachers",
    "students",
    "users",
    "items",
    "assignments",
  ];

  for (const data of candidates) {
    if (Array.isArray(data)) {
      return data;
    }

    if (!data || typeof data !== "object") {
      continue;
    }

    for (const key of possibleKeys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }
  }

  return [];
};
const extractAssignments = (result) =>
  extractList(result, ["assignments"]);

const extractPagination = (result) =>
  result?.pagination ??
  result?.data?.pagination ??
  result?.data?.data?.pagination ??
  null;

// ==================================================
// MAIN COMPONENT
// ==================================================

export default function CourseAssignments() {
  // ==================================================
  // LOOKUP DATA
  // ==================================================

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
const [cohorts, setCohorts] = useState([]);
  const [lookupsLoading, setLookupsLoading] =
    useState(true);

  const [lookupError, setLookupError] =
    useState("");

  const [lookupReloadKey, setLookupReloadKey] =
    useState(0);

  // ==================================================
  // ASSIGNMENTS
  // ==================================================

  const [assignments, setAssignments] =
    useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [page, setPage] = useState(1);

  const [statusFilter, setStatusFilter] =
    useState("true");

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  // ==================================================
  // FORMS
  // ==================================================

  const [teacherForm, setTeacherForm] =
    useState(initialTeacherForm);

  const [studentForm, setStudentForm] =
    useState(initialStudentForm);

  const [
    expandedAssignmentId,
    setExpandedAssignmentId,
  ] = useState(null);

  // ==================================================
  // LOAD LOOKUP DATA
  // ==================================================

  useEffect(() => {
    const controller = new AbortController();

    const loadLookups = async () => {
      setLookupsLoading(true);
      setLookupError("");

      const requests = [{
  name: "Cohorts",
  url: "/admin/cohorts",
  params: {
    page: 1,
    limit: LOOKUP_LIMIT,
  },
  keys: ["records", "cohorts", "items"],
  setter: setCohorts,
},
        {
          name: "Courses",
          url: "/admin/courses",
          params: {
            page: 1,
            limit: LOOKUP_LIMIT,
          },
          keys: [
            "records",
            "courses",
            "items",
          ],
          setter: setCourses,
        },
        {
          name: "Teachers",
          url: "/admin/teachers",
          params: {
            page: 1,
            limit: LOOKUP_LIMIT,
            status: "active",
          },
          keys: [
            "users",
            "teachers",
            "records",
          ],
          setter: setTeachers,
        },
        {
          name: "Students",
          url: "/admin/students",
          params: {
            page: 1,
            limit: LOOKUP_LIMIT,
            status: "active",
          },
          keys: [
            "users",
            "students",
            "records",
          ],
          setter: setStudents,
        },
      ];

      try {
        const results = await Promise.allSettled(
          requests.map((request) =>
            api.get(request.url, {
              params: request.params,
              signal: controller.signal,
            })
          )
        );

        if (controller.signal.aborted) {
          return;
        }

        const errors = [];

        results.forEach((result, index) => {
          const request = requests[index];

          if (result.status === "fulfilled") {
            const records = extractList(
              result.value,
              request.keys
            );

            request.setter(records);

            if (import.meta.env.DEV) {
              console.debug(
                `[CourseAssignments] ${request.name}`,
                records.length
              );
            }
          } else {
            if (isAbortError(result.reason)) {
              return;
            }

            request.setter([]);

            errors.push(
              `${request.name}: ${getErrorMessage(
                result.reason
              )}`
            );
          }
        });

        setLookupError(errors.join("\n"));
      } catch (err) {
        if (!controller.signal.aborted) {
          setLookupError(getErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLookupsLoading(false);
        }
      }
    };

    loadLookups();

    return () => controller.abort();
  }, [lookupReloadKey]);

  // ==================================================
  // LOAD ASSIGNMENTS
  // ==================================================

  useEffect(() => {
    const controller = new AbortController();

    const loadAssignments = async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await courseAccessService.getAllAssignments(
            {
              page,
              limit: PAGE_SIZE,
              ...(statusFilter !== "all"
                ? {
                    isActive:
                      statusFilter === "true",
                  }
                : {}),
            },
            controller.signal
          );

        if (controller.signal.aborted) return;

        const records = extractAssignments(result);

        setAssignments(records);

        setPagination(
          extractPagination(result) ?? {
            page,
            limit: PAGE_SIZE,
            total: records.length,
            totalPages: 1,
          }
        );
      } catch (err) {
        if (
          controller.signal.aborted ||
          isAbortError(err)
        ) {
          return;
        }

        setAssignments([]);
        setError(getErrorMessage(err));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadAssignments();

    return () => controller.abort();
  }, [page, statusFilter, reloadKey]);

  // ==================================================
  // REFRESH
  // ==================================================

  const refreshAssignments = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  const refreshAll = () => {
    setLookupReloadKey((value) => value + 1);
    refreshAssignments();
  };

  // ==================================================
  // FILTER ASSIGNMENTS
  // ==================================================

  const filteredAssignments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return assignments;

    return assignments.filter((assignment) => {
      const course = assignment.course;
      const teacher = assignment.teacher;

      const searchableText = [
        course?.code,
        course?.title,
        getName(teacher),
        teacher?.email,
        assignment._id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [assignments, search]);

  // ==================================================
  // ACTIVE ASSIGNMENTS FOR STUDENT FORM
  // ==================================================

  const activeAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => assignment.isActive
      ),
    [assignments]
  );

  // ==================================================
  // ASSIGN TEACHER
  // ==================================================

 const handleAssignTeacher = async (event) => {
  event.preventDefault();

  const payload = {
    cohortId: teacherForm.cohortId,
    courseId: teacherForm.courseId,
    teacherId: teacherForm.teacherId,
  };

  if (
    !payload.cohortId ||
    !payload.courseId ||
    !payload.teacherId
  ) {
    setError("Please select a cohort, course and teacher.");
    return;
  }

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    if (import.meta.env.DEV) {
      console.debug("Teacher assignment payload:", payload);
    }

    await courseAccessService.assignTeacher(payload);

    setSuccess("Teacher assigned successfully.");
    setTeacherForm(initialTeacherForm);
    setPage(1);
    refreshAssignments();
  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setSaving(false);
  }
};

  // ==================================================
  // ASSIGN STUDENT
  // ==================================================

  const handleAssignStudent = async (event) => {
    event.preventDefault();

    if (
      !studentForm.assignmentId ||
      !studentForm.studentId
    ) {
      setError(
        "Please select an assignment and student."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await courseAccessService.assignStudent(
        studentForm
      );

      setSuccess("Student assigned successfully.");
      setStudentForm(initialStudentForm);

      refreshAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // REMOVE STUDENT
  // ==================================================

  const handleRemoveStudent = async (
    assignmentId,
    studentId
  ) => {
    const confirmed = window.confirm(
      "Remove this student from the course assignment?"
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await courseAccessService.removeStudent({
        assignmentId,
        studentId,
      });

      setSuccess("Student removed successfully.");

      refreshAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // REVOKE ASSIGNMENT
  // ==================================================

  const handleRevokeAssignment = async (
    assignmentId
  ) => {
    const confirmed = window.confirm(
      "Revoke this assignment? The teacher and assigned students will lose access through this assignment."
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await courseAccessService.revokeAssignment(
        assignmentId
      );

      setSuccess("Assignment revoked successfully.");

      refreshAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // PAGINATION
  // ==================================================

  const totalPages = Math.max(
    1,
    pagination.totalPages || 1
  );

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <VStack align="stretch" gap={6}>
      {/* ========================================== */}
      {/* HEADER */}
      {/* ========================================== */}

      <Flex
        justify="space-between"
        align="center"
        gap={3}
        wrap="wrap"
      >
        <Box>
          <Heading size="xl">
            Course Assignments
          </Heading>

          <Text color="fg.muted" fontSize="sm">
            Manage teachers, students and course access.
          </Text>
        </Box>

        <Button
          variant="outline"
          onClick={refreshAll}
          disabled={loading || saving || lookupsLoading}
        >
          Refresh
        </Button>
      </Flex>

      {/* ========================================== */}
      {/* MESSAGES */}
      {/* ========================================== */}

      {error && (
        <Box
          role="alert"
          borderWidth="1px"
          borderColor="red.400"
          borderRadius="md"
          p={3}
        >
          <Text color="red.500" whiteSpace="pre-line">
            {error}
          </Text>
        </Box>
      )}

      {lookupError && (
        <Box
          role="alert"
          borderWidth="1px"
          borderColor="orange.400"
          borderRadius="md"
          p={3}
        >
          <Text
            color="orange.500"
            whiteSpace="pre-line"
          >
            Lookup data could not be fully loaded:
            {"\n"}
            {lookupError}
          </Text>
        </Box>
      )}

      {success && (
        <Box
          role="status"
          borderWidth="1px"
          borderColor="green.400"
          borderRadius="md"
          p={3}
        >
          <Text color="green.500">
            {success}
          </Text>
        </Box>
      )}

      {/* ========================================== */}
      {/* LOOKUP SUMMARY */}
      {/* ========================================== */}

      <Flex gap={3} wrap="wrap">
        <Badge variant="subtle">
          Courses: {courses.length}
        </Badge>

        <Badge variant="subtle">
          Teachers: {teachers.length}
        </Badge>

        <Badge variant="subtle">
          Students: {students.length}
        </Badge>

        {lookupsLoading && (
          <HStack gap={2}>
            <Spinner size="xs" />
            <Text fontSize="xs" color="fg.muted">
              Loading lookup data...
            </Text>
          </HStack>
        )}
      </Flex>

      {/* ========================================== */}
      {/* ASSIGNMENT FORMS */}
      {/* ========================================== */}

      <Flex
        gap={5}
        direction={{
          base: "column",
          lg: "row",
        }}
      >
        {/* ======================================== */}
        {/* ASSIGN TEACHER */}
        {/* ======================================== */}

        <Card.Root flex="1">
          <Card.Header>
            <Heading size="md">
              Assign Teacher
            </Heading>
          </Card.Header>

          <Card.Body>
            <form onSubmit={handleAssignTeacher}>
              <VStack align="stretch" gap={4}>
                {/* COURSE */}
<Box>
  <Text mb={2} fontWeight="medium">
    Cohort
  </Text>

 <NativeSelect.Root>
  <NativeSelect.Field
    value={teacherForm.cohortId}
    disabled={lookupsLoading || saving}
    onChange={(event) =>
      setTeacherForm((prev) => ({
        ...prev,
        cohortId: event.target.value,
        courseId: "",
      }))
    }
  >
    <option value="">Select cohort</option>

    {cohorts.map((cohort) => (
      <option
        key={getId(cohort)}
        value={getId(cohort)}
      >
        {cohort.code} — {cohort.name}
      </option>
    ))}
  </NativeSelect.Field>
  <NativeSelect.Indicator />
</NativeSelect.Root>
</Box>
                <Box>
                  <Text mb={2} fontWeight="medium">
                    Course
                  </Text>

                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={teacherForm.courseId}
                      disabled={lookupsLoading || saving}
                      onChange={(event) =>
                        setTeacherForm((prev) => ({
                          ...prev,
                          courseId: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {lookupsLoading
                          ? "Loading courses..."
                          : courses.length === 0
                            ? "No courses available"
                            : "Select course"}
                      </option>

                      {courses.map((course) => (
                        <option
                          key={getId(course)}
                          value={getId(course)}
                        >
                          {course.code || "No Code"}
                          {" — "}
                          {course.title ||
                            course.name ||
                            "Untitled Course"}
                        </option>
                      ))}
                    </NativeSelect.Field>

                    <NativeSelect.Indicator />
                  </NativeSelect.Root>

                  {!lookupsLoading &&
                    courses.length === 0 && (
                      <Text
                        mt={2}
                        fontSize="xs"
                        color="orange.500"
                      >
                        No course records were returned.
                        Check the Courses API response.
                      </Text>
                    )}
                </Box>

                {/* TEACHER */}

                <Box>
                  <Text mb={2} fontWeight="medium">
                    Teacher
                  </Text>

                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={teacherForm.teacherId}
                      disabled={lookupsLoading || saving}
                      onChange={(event) =>
                        setTeacherForm((prev) => ({
                          ...prev,
                          teacherId: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {lookupsLoading
                          ? "Loading teachers..."
                          : teachers.length === 0
                            ? "No teachers available"
                            : "Select teacher"}
                      </option>

                      {teachers.map((teacher) => (
                        <option
                          key={getId(teacher)}
                          value={teacher.profileId || ""}
                          disabled={!teacher.profileId}
                        >
                          {getName(teacher)}
                          {!teacher.profileId
                            ? " (profile ID unavailable)"
                            : ""}
                        </option>
                      ))}
                    </NativeSelect.Field>

                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Box>

                {/* SUBMIT */}

                <Button
                  type="submit"
                  loading={saving}
                  disabled={
                    lookupsLoading ||
                    !teacherForm.courseId ||
                    !teacherForm.teacherId
                  }
                >
                  Assign Teacher
                </Button>
              </VStack>
            </form>
          </Card.Body>
        </Card.Root>

        {/* ======================================== */}
        {/* ASSIGN STUDENT */}
        {/* ======================================== */}

        <Card.Root flex="1">
          <Card.Header>
            <Heading size="md">
              Assign Student
            </Heading>
          </Card.Header>

          <Card.Body>
            <form onSubmit={handleAssignStudent}>
              <VStack align="stretch" gap={4}>
                {/* COURSE ASSIGNMENT */}

                <Box>
                  <Text mb={2} fontWeight="medium">
                    Course Assignment
                  </Text>

                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={studentForm.assignmentId}
                      disabled={loading || saving}
                      onChange={(event) =>
                        setStudentForm((prev) => ({
                          ...prev,
                          assignmentId:
                            event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        Select assignment
                      </option>

                      {activeAssignments.map(
                        (assignment) => (
                          <option
                            key={assignment._id}
                            value={assignment._id}
                          >
                            {assignment.course?.code ||
                              "Course"}
                            {" — "}
                            {getName(assignment.teacher)}
                          </option>
                        )
                      )}
                    </NativeSelect.Field>

                    <NativeSelect.Indicator />
                  </NativeSelect.Root>

                  {!loading &&
                    activeAssignments.length === 0 && (
                      <Text
                        mt={2}
                        fontSize="xs"
                        color="fg.muted"
                      >
                        Assign a teacher to a course
                        first.
                      </Text>
                    )}
                </Box>

                {/* STUDENT */}

                <Box>
                  <Text mb={2} fontWeight="medium">
                    Student
                  </Text>

                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={studentForm.studentId}
                      disabled={lookupsLoading || saving}
                      onChange={(event) =>
                        setStudentForm((prev) => ({
                          ...prev,
                          studentId: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {lookupsLoading
                          ? "Loading students..."
                          : students.length === 0
                            ? "No students available"
                            : "Select student"}
                      </option>

                      {students.map((student) => (
                        <option
                          key={getId(student)}
                          value={student.profileId || ""}
                          disabled={!student.profileId}
                        >
                          {student.studentId
                            ? `${student.studentId} — `
                            : ""}
                          {getName(student)}
                          {!student.profileId
                            ? " (profile ID unavailable)"
                            : ""}
                        </option>
                      ))}
                    </NativeSelect.Field>

                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Box>

                {/* SUBMIT */}

                <Button
                  type="submit"
                  loading={saving}
                  disabled={
                    lookupsLoading ||
                    loading ||
                    !studentForm.assignmentId ||
                    !studentForm.studentId
                  }
                >
                  Assign Student
                </Button>
              </VStack>
            </form>
          </Card.Body>
        </Card.Root>
      </Flex>

      {/* ========================================== */}
      {/* FILTERS */}
      {/* ========================================== */}

      <Card.Root>
        <Card.Body>
          <Flex gap={3} wrap="wrap">
            <Input
              flex="1"
              minW="220px"
              placeholder="Search course or teacher..."
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setSearch(searchInput.trim());
                }
              }}
            />

            <NativeSelect.Root width="180px">
              <NativeSelect.Field
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                  setStudentForm(initialStudentForm);
                }}
              >
                <option value="true">
                  Active
                </option>

                <option value="false">
                  Revoked
                </option>

                <option value="all">
                  All
                </option>
              </NativeSelect.Field>

              <NativeSelect.Indicator />
            </NativeSelect.Root>

            <Button
              variant="outline"
              onClick={() =>
                setSearch(searchInput.trim())
              }
            >
              Search
            </Button>
          </Flex>
        </Card.Body>
      </Card.Root>

      {/* ========================================== */}
      {/* ASSIGNMENTS TABLE */}
      {/* ========================================== */}

      <Card.Root>
        <Card.Header>
          <Flex
            justify="space-between"
            align="center"
            gap={3}
            wrap="wrap"
          >
            <Heading size="md">
              All Course Assignments
            </Heading>

            <Text fontSize="sm" color="fg.muted">
              {pagination.total} records
            </Text>
          </Flex>
        </Card.Header>

        <Card.Body>
          {loading ? (
            <Flex justify="center" py={10}>
              <Spinner size="lg" />
            </Flex>
          ) : filteredAssignments.length === 0 ? (
            <Text
              textAlign="center"
              color="fg.muted"
              py={8}
            >
              No assignments found.
            </Text>
          ) : (
            <Box overflowX="auto">
              <Table.Root
                size="sm"
                variant="line"
              >
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>
                      Course
                    </Table.ColumnHeader>

                    <Table.ColumnHeader>
                      Teacher
                    </Table.ColumnHeader>

                    <Table.ColumnHeader>
                      Students
                    </Table.ColumnHeader>

                    <Table.ColumnHeader>
                      Status
                    </Table.ColumnHeader>

                    <Table.ColumnHeader>
                      Actions
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {filteredAssignments.map(
                    (assignment) => (
                      <Table.Row key={assignment._id}>
                        {/* COURSE */}

                        <Table.Cell>
                          <Text fontWeight="medium">
                            {assignment.course?.title ||
                              "Unknown course"}
                          </Text>

                          <Text
                            fontSize="xs"
                            color="fg.muted"
                          >
                            {assignment.course?.code ||
                              "—"}
                          </Text>
                        </Table.Cell>

                        {/* TEACHER */}

                        <Table.Cell>
                          {getName(assignment.teacher)}
                        </Table.Cell>

                        {/* STUDENT COUNT */}

                        <Table.Cell>
                          {assignment.students?.length || 0}
                        </Table.Cell>

                        {/* STATUS */}

                        <Table.Cell>
                          <Badge
                            colorPalette={
                              assignment.isActive
                                ? "green"
                                : "red"
                            }
                            variant="subtle"
                          >
                            {assignment.isActive
                              ? "Active"
                              : "Revoked"}
                          </Badge>
                        </Table.Cell>

                        {/* ACTIONS */}

                        <Table.Cell>
                          <HStack gap={2}>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                setExpandedAssignmentId(
                                  (current) =>
                                    current === assignment._id
                                      ? null
                                      : assignment._id
                                )
                              }
                            >
                              Students
                            </Button>

                            {assignment.isActive && (
                              <Button
                                size="xs"
                                colorPalette="red"
                                variant="outline"
                                disabled={saving}
                                onClick={() =>
                                  handleRevokeAssignment(
                                    assignment._id
                                  )
                                }
                              >
                                Revoke
                              </Button>
                            )}
                          </HStack>

                          {/* STUDENT ROSTER */}

                          {expandedAssignmentId ===
                            assignment._id && (
                            <VStack
                              align="stretch"
                              mt={3}
                              gap={2}
                            >
                              {(assignment.students || [])
                                .length === 0 ? (
                                <Text fontSize="xs">
                                  No students assigned.
                                </Text>
                              ) : (
                                assignment.students.map(
                                  (student) => (
                                    <Flex
                                      key={getId(student)}
                                      justify="space-between"
                                      align="center"
                                      gap={2}
                                    >
                                      <Text fontSize="xs">
                                        {student.studentId ||
                                          "—"}
                                        {" — "}
                                        {getName(student)}
                                      </Text>

                                      {assignment.isActive && (
                                        <Button
                                          size="xs"
                                          variant="ghost"
                                          colorPalette="red"
                                          disabled={saving}
                                          onClick={() =>
                                            handleRemoveStudent(
                                              assignment._id,
                                              getId(student)
                                            )
                                          }
                                        >
                                          Remove
                                        </Button>
                                      )}
                                    </Flex>
                                  )
                                )
                              )}
                            </VStack>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    )
                  )}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Card.Body>
      </Card.Root>

      {/* ========================================== */}
      {/* PAGINATION */}
      {/* ========================================== */}

      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={3}
      >
        <Text fontSize="sm" color="fg.muted">
          Page {page} of {totalPages}
        </Text>

        <HStack gap={2}>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() =>
              setPage((current) => current - 1)
            }
          >
            Previous
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={
              page >= totalPages || loading
            }
            onClick={() =>
              setPage((current) => current + 1)
            }
          >
            Next
          </Button>
        </HStack>
      </Flex>
    </VStack>
  );
}
