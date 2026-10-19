
import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react";

// ==================================================
// CONSTANTS
// ==================================================

const MAX_SEMESTERS = 40;
const MAX_COURSES_PER_SEMESTER = 30;

const COURSE_TYPES = [
  { value: "core", label: "Core" },
  { value: "elective", label: "Elective" },
  {
    value: "general_education",
    label: "General Education",
  },
];

// ==================================================
// HELPERS
// ==================================================

const getId = (value) => {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    return value._id ?? "";
  }

  return "";
};

const getCourseLabel = (course) => {
  const code = course.code
    ? `${course.code} — `
    : "";

  return (
    code +
    (course.title ||
      course.name ||
      course._id)
  );
};

const createCourseEntry = (order = 1) => ({
  course: "",
  courseType: "core",
  order,
});

const createSemester = (
  yearNumber = 1,
  semesterNumber = 1,
) => ({
  yearNumber,
  semesterNumber,
  courses: [createCourseEntry()],
});

const normalizeSemesters = (semesters) => {
  if (!Array.isArray(semesters)) {
    return [];
  }

  return semesters.map((semester) => ({
    yearNumber: Number(
      semester.yearNumber ?? 1,
    ),

    semesterNumber: Number(
      semester.semesterNumber ?? 1,
    ),

    courses: Array.isArray(semester.courses)
      ? semester.courses.map((entry, index) => ({
          course: getId(entry.course),

          courseType:
            entry.courseType ?? "core",

          order: Number(
            entry.order ?? index + 1,
          ),
        }))
      : [],
  }));
};

// ==================================================
// COMPONENT
// ==================================================

export default function CurriculumSemesterEditor({
  value = [],
  onChange,
  courses = [],
  disabled = false,
}) {
  const [showErrors, setShowErrors] =
    useState(false);

  const semesters = useMemo(
    () => normalizeSemesters(value),
    [value],
  );

  const courseOptions = useMemo(
    () =>
      Array.isArray(courses)
        ? courses.filter((course) => course?._id)
        : [],
    [courses],
  );

  // ==================================================
  // EMIT CHANGE
  // ==================================================

  const emitChange = useCallback(
    (next) => {
      if (disabled) return;

      onChange?.(next);
    },
    [onChange, disabled],
  );

  // ==================================================
  // UPDATE SEMESTER
  // ==================================================

  const updateSemester = (
    semesterIndex,
    field,
    nextValue,
  ) => {
    const next = semesters.map(
      (semester, index) =>
        index === semesterIndex
          ? {
              ...semester,
              [field]: nextValue,
            }
          : semester,
    );

    emitChange(next);
  };

  // ==================================================
  // ADD SEMESTER
  // ==================================================

  const addSemester = () => {
    if (
      disabled ||
      semesters.length >= MAX_SEMESTERS
    ) {
      return;
    }

    const last = semesters.at(-1);

    const nextYear = last?.yearNumber ?? 1;

    const nextSemester =
      last?.semesterNumber
        ? last.semesterNumber + 1
        : 1;

    emitChange([
      ...semesters,
      createSemester(
        nextYear,
        nextSemester,
      ),
    ]);
  };

  // ==================================================
  // REMOVE SEMESTER
  // ==================================================

  const removeSemester = (
    semesterIndex,
  ) => {
    emitChange(
      semesters.filter(
        (_, index) =>
          index !== semesterIndex,
      ),
    );
  };

  // ==================================================
  // UPDATE COURSE ENTRY
  // ==================================================

  const updateCourseEntry = (
    semesterIndex,
    courseIndex,
    field,
    nextValue,
  ) => {
    const next = semesters.map(
      (semester, index) => {
        if (index !== semesterIndex) {
          return semester;
        }

        return {
          ...semester,

          courses: semester.courses.map(
            (entry, entryIndex) =>
              entryIndex === courseIndex
                ? {
                    ...entry,
                    [field]: nextValue,
                  }
                : entry,
          ),
        };
      },
    );

    emitChange(next);
  };

  // ==================================================
  // ADD COURSE
  // ==================================================

  const addCourse = (
    semesterIndex,
  ) => {
    const next = semesters.map(
      (semester, index) => {
        if (index !== semesterIndex) {
          return semester;
        }

        if (
          semester.courses.length >=
          MAX_COURSES_PER_SEMESTER
        ) {
          return semester;
        }

        const maxOrder = Math.max(
          0,
          ...semester.courses.map(
            (entry) =>
              Number(entry.order) || 0,
          ),
        );

        return {
          ...semester,

          courses: [
            ...semester.courses,
            createCourseEntry(maxOrder + 1),
          ],
        };
      },
    );

    emitChange(next);
  };

  // ==================================================
  // REMOVE COURSE
  // ==================================================

  const removeCourse = (
    semesterIndex,
    courseIndex,
  ) => {
    const next = semesters.map(
      (semester, index) => {
        if (index !== semesterIndex) {
          return semester;
        }

        const remaining =
          semester.courses.filter(
            (_, entryIndex) =>
              entryIndex !== courseIndex,
          );

        return {
          ...semester,

          courses: remaining.map(
            (entry, index) => ({
              ...entry,
              order: index + 1,
            }),
          ),
        };
      },
    );

    emitChange(next);
  };

  // ==================================================
  // VALIDATION
  // ==================================================

  const errors = useMemo(() => {
    const result = [];

    if (
      semesters.length >
      MAX_SEMESTERS
    ) {
      result.push(
        "A curriculum cannot contain more than 40 semesters.",
      );
    }

    const semesterKeys = new Set();

    semesters.forEach(
      (semester, semesterIndex) => {
        const prefix =
          `Semester ${semesterIndex + 1}`;

        if (
          !Number.isInteger(
            semester.yearNumber,
          ) ||
          semester.yearNumber < 1 ||
          semester.yearNumber > 10
        ) {
          result.push(
            `${prefix}: Year must be between 1 and 10.`,
          );
        }

        if (
          !Number.isInteger(
            semester.semesterNumber,
          ) ||
          semester.semesterNumber < 1 ||
          semester.semesterNumber > 40
        ) {
          result.push(
            `${prefix}: Semester number must be between 1 and 40.`,
          );
        }

        const key =
          `${semester.yearNumber}:${semester.semesterNumber}`;

        if (semesterKeys.has(key)) {
          result.push(
            `${prefix}: Duplicate year and semester combination.`,
          );
        }

        semesterKeys.add(key);

        if (
          semester.courses.length >
          MAX_COURSES_PER_SEMESTER
        ) {
          result.push(
            `${prefix}: Maximum 30 courses allowed.`,
          );
        }

        const selectedCourses = new Set();
        const usedOrders = new Set();

        semester.courses.forEach(
          (entry, courseIndex) => {
            const coursePrefix =
              `${prefix}, Course ${courseIndex + 1}`;

            if (!entry.course) {
              result.push(
                `${coursePrefix}: Select a course.`,
              );
            } else if (
              selectedCourses.has(
                entry.course,
              )
            ) {
              result.push(
                `${coursePrefix}: Duplicate course.`,
              );
            }

            if (entry.course) {
              selectedCourses.add(
                entry.course,
              );
            }

            if (
              !Number.isInteger(
                entry.order,
              ) ||
              entry.order < 1
            ) {
              result.push(
                `${coursePrefix}: Order must be a positive integer.`,
              );
            } else if (
              usedOrders.has(
                entry.order,
              )
            ) {
              result.push(
                `${coursePrefix}: Duplicate order number.`,
              );
            }

            usedOrders.add(
              entry.order,
            );

            if (
              !COURSE_TYPES.some(
                (type) =>
                  type.value ===
                  entry.courseType,
              )
            ) {
              result.push(
                `${coursePrefix}: Invalid course type.`,
              );
            }
          },
        );
      },
    );

    return result;
  }, [semesters]);

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <VStack
      align="stretch"
      gap={4}
    >
      {/* HEADER */}

      <Flex
        justify="space-between"
        align="center"
        gap={3}
        wrap="wrap"
      >
        <Box>
          <Heading size="sm">
            Curriculum Structure
          </Heading>

          <Text
            fontSize="xs"
            color="fg.muted"
          >
            Configure academic years,
            semesters and assigned courses.
          </Text>
        </Box>

        <Button
          size="sm"
          variant="outline"
          disabled={
            disabled ||
            semesters.length >=
              MAX_SEMESTERS
          }
          onClick={addSemester}
        >
          + Add Semester
        </Button>
      </Flex>

      {/* EMPTY STATE */}

      {semesters.length === 0 && (
        <Box
          borderWidth="1px"
          borderStyle="dashed"
          borderRadius="lg"
          p={6}
          textAlign="center"
        >
          <Text
            color="fg.muted"
            fontSize="sm"
            mb={3}
          >
            No semesters have been added.
          </Text>

          <Button
            size="sm"
            disabled={disabled}
            onClick={addSemester}
          >
            Add First Semester
          </Button>
        </Box>
      )}

      {/* SEMESTER CARDS */}

      {semesters.map(
        (semester, semesterIndex) => {
          const selectedIds = new Set(
            semester.courses
              .map((entry) => entry.course)
              .filter(Boolean),
          );

          return (
            <Box
              key={semesterIndex}
              borderWidth="1px"
              borderRadius="xl"
              p={4}
            >
              <Flex
                justify="space-between"
                align="center"
                mb={4}
                gap={2}
              >
                <Flex
                  align="center"
                  gap={2}
                >
                  <Heading size="sm">
                    Semester{" "}
                    {semesterIndex + 1}
                  </Heading>

                  <Badge variant="subtle">
                    {semester.courses.length}
                    {" "}Courses
                  </Badge>
                </Flex>

                <Button
                  size="xs"
                  variant="outline"
                  colorPalette="red"
                  disabled={disabled}
                  onClick={() =>
                    removeSemester(
                      semesterIndex,
                    )
                  }
                >
                  Remove
                </Button>
              </Flex>

              {/* YEAR AND SEMESTER */}

              <Flex
                gap={3}
                mb={4}
                direction={{
                  base: "column",
                  md: "row",
                }}
              >
                <Field.Root>
                  <Field.Label>
                    Year Number
                  </Field.Label>

                  <Input
                    type="number"
                    min={1}
                    max={10}
                    disabled={disabled}
                    value={
                      semester.yearNumber
                    }
                    onChange={(event) =>
                      updateSemester(
                        semesterIndex,
                        "yearNumber",
                        event.target.value === ""
                          ? 0
                          : Number(
                              event.target.value,
                            ),
                      )
                    }
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>
                    Semester Number
                  </Field.Label>

                  <Input
                    type="number"
                    min={1}
                    max={40}
                    disabled={disabled}
                    value={
                      semester.semesterNumber
                    }
                    onChange={(event) =>
                      updateSemester(
                        semesterIndex,
                        "semesterNumber",
                        event.target.value === ""
                          ? 0
                          : Number(
                              event.target.value,
                            ),
                      )
                    }
                  />
                </Field.Root>
              </Flex>

              {/* COURSE ROWS */}

              <VStack
                align="stretch"
                gap={3}
              >
                {semester.courses.map(
                  (entry, courseIndex) => (
                    <Box
                      key={courseIndex}
                      p={3}
                      borderWidth="1px"
                      borderRadius="md"
                    >
                      <Flex
                        justify="space-between"
                        align="center"
                        mb={3}
                      >
                        <Text
                          fontSize="sm"
                          fontWeight="semibold"
                        >
                          Course{" "}
                          {courseIndex + 1}
                        </Text>

                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          disabled={disabled}
                          onClick={() =>
                            removeCourse(
                              semesterIndex,
                              courseIndex,
                            )
                          }
                        >
                          Remove
                        </Button>
                      </Flex>

                      <VStack
                        align="stretch"
                        gap={3}
                      >
                        <Field.Root required>
                          <Field.Label>
                            Course
                          </Field.Label>

                          <NativeSelect.Root>
                            <NativeSelect.Field
                              disabled={disabled}
                              value={
                                entry.course
                              }
                              onChange={(
                                event,
                              ) =>
                                updateCourseEntry(
                                  semesterIndex,
                                  courseIndex,
                                  "course",
                                  event.target.value,
                                )
                              }
                            >
                              <option value="">
                                Select Course
                              </option>

                              {courseOptions.map(
                                (course) => {
                                  const isSelectedElsewhere =
                                    selectedIds.has(
                                      course._id,
                                    ) &&
                                    course._id !==
                                      entry.course;

                                  return (
                                    <option
                                      key={
                                        course._id
                                      }
                                      value={
                                        course._id
                                      }
                                      disabled={
                                        isSelectedElsewhere
                                      }
                                    >
                                      {getCourseLabel(
                                        course,
                                      )}
                                    </option>
                                  );
                                },
                              )}
                            </NativeSelect.Field>

                            <NativeSelect.Indicator />
                          </NativeSelect.Root>
                        </Field.Root>

                        <Flex
                          gap={3}
                          direction={{
                            base: "column",
                            md: "row",
                          }}
                        >
                          <Field.Root>
                            <Field.Label>
                              Course Type
                            </Field.Label>

                            <NativeSelect.Root>
                              <NativeSelect.Field
                                disabled={
                                  disabled
                                }
                                value={
                                  entry.courseType
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateCourseEntry(
                                    semesterIndex,
                                    courseIndex,
                                    "courseType",
                                    event.target.value,
                                  )
                                }
                              >
                                {COURSE_TYPES.map(
                                  (type) => (
                                    <option
                                      key={
                                        type.value
                                      }
                                      value={
                                        type.value
                                      }
                                    >
                                      {
                                        type.label
                                      }
                                    </option>
                                  ),
                                )}
                              </NativeSelect.Field>

                              <NativeSelect.Indicator />
                            </NativeSelect.Root>
                          </Field.Root>

                          <Field.Root>
                            <Field.Label>
                              Order
                            </Field.Label>

                            <Input
                              type="number"
                              min={1}
                              disabled={disabled}
                              value={
                                entry.order
                              }
                              onChange={(
                                event,
                              ) =>
                                updateCourseEntry(
                                  semesterIndex,
                                  courseIndex,
                                  "order",
                                  event.target.value === ""
                                    ? 0
                                    : Number(
                                        event.target.value,
                                      ),
                                )
                              }
                            />
                          </Field.Root>
                        </Flex>
                      </VStack>
                    </Box>
                  ),
                )}

                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    disabled ||
                    semester.courses.length >=
                      MAX_COURSES_PER_SEMESTER
                  }
                  onClick={() =>
                    addCourse(
                      semesterIndex,
                    )
                  }
                >
                  + Add Course
                </Button>
              </VStack>
            </Box>
          );
        },
      )}

      {/* VALIDATION */}

      {errors.length > 0 && (
        <Box
          borderWidth="1px"
          borderColor={
            showErrors
              ? "red.400"
              : "border"
          }
          borderRadius="md"
          p={3}
        >
          <Flex
            justify="space-between"
            align="center"
          >
            <Text
              fontSize="sm"
              fontWeight="semibold"
            >
              {errors.length} validation
              {" "}issue(s)
            </Text>

            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                setShowErrors(
                  (previous) => !previous,
                )
              }
            >
              {showErrors
                ? "Hide Issues"
                : "Show Issues"}
            </Button>
          </Flex>

          {showErrors && (
            <VStack
              align="stretch"
              mt={3}
              gap={1}
            >
              {errors.map(
                (error, index) => (
                  <Text
                    key={index}
                    fontSize="xs"
                    color="red.500"
                  >
                    • {error}
                  </Text>
                ),
              )}
            </VStack>
          )}
        </Box>
      )}
    </VStack>
  );
}

// ==================================================
// EXPORTED VALIDATION FOR PARENT FORM
// ==================================================

export const validateCurriculumSemesters = (
  value,
) => {
  const semesters = normalizeSemesters(value);
  const errors = [];
  const semesterKeys = new Set();

  if (semesters.length > MAX_SEMESTERS) {
    errors.push("Maximum 40 semesters allowed.");
  }

  for (const semester of semesters) {
    const key =
      `${semester.yearNumber}:${semester.semesterNumber}`;

    if (
      !Number.isInteger(semester.yearNumber) ||
      semester.yearNumber < 1 ||
      semester.yearNumber > 10
    ) {
      errors.push("Invalid year number.");
    }

    if (
      !Number.isInteger(semester.semesterNumber) ||
      semester.semesterNumber < 1 ||
      semester.semesterNumber > 40
    ) {
      errors.push("Invalid semester number.");
    }

    if (semesterKeys.has(key)) {
      errors.push("Duplicate semester.");
    }

    semesterKeys.add(key);

    if (
      semester.courses.length >
      MAX_COURSES_PER_SEMESTER
    ) {
      errors.push("Too many courses in a semester.");
    }

    const courseIds = new Set();
    const orders = new Set();

    for (const entry of semester.courses) {
      if (!entry.course) {
        errors.push("Course selection is required.");
      }

      if (
        entry.course &&
        courseIds.has(entry.course)
      ) {
        errors.push("Duplicate course in semester.");
      }

      if (
        !Number.isInteger(entry.order) ||
        entry.order < 1 ||
        orders.has(entry.order)
      ) {
        errors.push("Invalid or duplicate course order.");
      }

      if (
        !COURSE_TYPES.some(
          (type) => type.value === entry.courseType,
        )
      ) {
        errors.push("Invalid course type.");
      }

      courseIds.add(entry.course);
      orders.add(entry.order);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    semesters,
  };
};
