
import { useEffect, useState } from "react";

import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  Link as RouterLink,
  useParams,
} from "react-router-dom";

import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiClock,
  FiLock,
  FiLayers,
} from "react-icons/fi";

import PageHero from "../../components/common/PageHero.jsx";

import {
  getPublishedProgramCourses,
} from "../../services/publicAcademic.service.js";

const surface = {
  bg: "var(--public-surface)",
  color: "var(--public-text)",
  borderColor: "var(--public-border)",
};

const muted = "var(--public-muted)";
const accent = "var(--public-accent)";

function StatusCard({
  title,
  message,
  restricted = false,
}) {
  return (
    <Box
      {...surface}
      borderWidth="1px"
      borderRadius="2xl"
      maxW="720px"
      mx="auto"
      p={{ base: 7, md: 12 }}
      textAlign="center"
      boxShadow="0 14px 35px rgba(0,0,0,0.05)"
    >
      <VStack gap={5}>
        <Flex
          w="76px"
          h="76px"
          bg="var(--public-surface-alt)"
          color={accent}
          borderRadius="full"
          justify="center"
          align="center"
        >
          {restricted ? (
            <FiLock size={34} />
          ) : (
            <FiBookOpen size={34} />
          )}
        </Flex>

        <Heading
          size={{ base: "lg", md: "xl" }}
          color="var(--public-text)"
        >
          {title}
        </Heading>

        <Text
          color={muted}
          lineHeight="1.9"
          maxW="510px"
        >
          {message}
        </Text>

        {restricted && (
          <Box
            w="100%"
            bg="var(--public-surface-alt)"
            borderRadius="xl"
            p={4}
          >
            <Flex
              align="center"
              justify="center"
              gap={2}
            >
              <FiAlertCircle color={accent} />
              <Text fontSize="sm" color={muted}>
                Please contact your college
                administrator if you believe
                your course assignment is missing.
              </Text>
            </Flex>
          </Box>
        )}

        <Button
          as={RouterLink}
          to="/programs"
          colorPalette="blue"
          mt={2}
        >
          <FiArrowLeft />
          Back to Programs
        </Button>
      </VStack>
    </Box>
  );
}

function CourseCard({ course, programId }) {
  return (
    <Box
      {...surface}
      borderWidth="1px"
      borderRadius="2xl"
      p={{ base: 5, md: 6 }}
      display="flex"
      flexDirection="column"
      minW={0}
      boxShadow="0 4px 16px rgba(0,0,0,0.035)"
      transition="transform 0.2s, box-shadow 0.2s"
      _hover={{
        transform: "translateY(-4px)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.09)",
      }}
    >
      <Flex
        justify="space-between"
        align="center"
        gap={2}
        wrap="wrap"
      >
        <Badge
          colorPalette="blue"
          variant="subtle"
        >
          {course.courseType || "Course"}
        </Badge>

        <Text
          fontSize="xs"
          color={muted}
          fontWeight="semibold"
        >
          {course.code || "—"}
        </Text>
      </Flex>

      <Heading
        size="md"
        mt={5}
        lineHeight="1.5"
        color="var(--public-text)"
      >
        {course.title}
      </Heading>

      <Text
        mt={3}
        color={muted}
        fontSize="sm"
        lineHeight="1.8"
        flex="1"
      >
        {course.description
          ? course.description.length > 170
            ? `${course.description.slice(0, 170)}...`
            : course.description
          : "Explore the essential knowledge and skills covered in this course."}
      </Text>

      <Box
        mt={6}
        pt={5}
        borderTopWidth="1px"
        borderColor="var(--public-border)"
      >
        <Flex
          gap={3}
          wrap="wrap"
          justify="space-between"
        >
          <Flex align="center" gap={2}>
            <FiBookOpen color={accent} />
            <Text fontSize="sm">
              {course.credits ?? "—"} Credits
            </Text>
          </Flex>

          <Flex align="center" gap={2}>
            <FiClock color={accent} />
            <Text fontSize="sm">
              {course.lectureHours ?? "—"}h Theory
            </Text>
          </Flex>
        </Flex>

        <Text
          fontSize="xs"
          color={muted}
          mt={3}
        >
          Practical: {course.practicalHours ?? "—"} hours
        </Text>
      </Box>

      <Button
        as={RouterLink}
        to={`/academic/courses/${encodeURIComponent(programId)}/${encodeURIComponent(course._id)}`}
        colorPalette="blue"
        variant="outline"
        width="100%"
        mt={6}
      >
        View Course & Lessons
        <FiArrowRight />
      </Button>
    </Box>
  );
}

export default function Courses() {
  const { programId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadCourses = async () => {
      try {
        setLoading(true);
        setError("");
        setErrorStatus(null);
        setData(null);

        const result =
          await getPublishedProgramCourses(
            programId,
            controller.signal
          );

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setErrorStatus(
            err.response?.status ?? null
          );

          setError(
            err.response?.data?.message ||
              "Unable to load program courses."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadCourses();

    return () => controller.abort();
  }, [programId]);

  const semesters = data?.semesters ?? [];

  return (
    <>
      <PageHero
        title={
          data?.program?.name ??
          "Program Courses"
        }
        description="Explore your academic courses, organized by year and semester."
      />

      <Box
        bg="var(--public-bg)"
        color="var(--public-text)"
        minH="45vh"
      >
        <Container
          maxW="1280px"
          py={{ base: 8, md: 12 }}
        >
          <Button
            as={RouterLink}
            to="/programs"
            variant="outline"
            mb={8}
            borderColor="var(--public-border)"
            color="var(--public-text)"
          >
            <FiArrowLeft />
            Back to Programs
          </Button>

          {loading ? (
            <VStack py={16} gap={4}>
              <Spinner
                size="xl"
                color="blue.500"
              />
              <Text color={muted}>
                Loading your courses...
              </Text>
            </VStack>
          ) : error ? (
            <StatusCard
              restricted={
                errorStatus === 403 ||
                errorStatus === 401
              }
              title={
                errorStatus === 403
                  ? "Course Access Restricted"
                  : errorStatus === 401
                    ? "Sign In Required"
                    : "Unable to Load Courses"
              }
              message={error}
            />
          ) : !data?.curriculum ? (
            <StatusCard
              title="Course Information Coming Soon"
              message="The course structure for this program has not been published yet."
            />
          ) : data.totalCourses === 0 ? (
            <StatusCard
              title="No Assigned Courses"
              message="There are currently no accessible courses for your account in this published curriculum."
            />
          ) : (
            <VStack align="stretch" gap={10}>
              <Box
                {...surface}
                borderWidth="1px"
                borderRadius="2xl"
                p={{ base: 6, md: 8 }}
              >
                <Text
                  color={accent}
                  fontWeight="bold"
                  fontSize="xs"
                  letterSpacing="widest"
                >
                  YOUR ACADEMIC STUDY PLAN
                </Text>

                <Heading
                  size={{ base: "lg", md: "xl" }}
                  mt={3}
                  color="var(--public-text)"
                >
                  {data.program?.name}
                </Heading>

                <Text
                  mt={3}
                  color={muted}
                  lineHeight="1.8"
                >
                  Explore the courses available to
                  your account in this program.
                </Text>

                <Flex
                  mt={6}
                  gap={3}
                  wrap="wrap"
                >
                  <Badge
                    colorPalette="blue"
                    variant="subtle"
                    px={3}
                    py={2}
                  >
                    {data.totalCourses} Courses
                  </Badge>

                  {data.program?.code && (
                    <Badge
                      variant="outline"
                      px={3}
                      py={2}
                    >
                      {data.program.code}
                    </Badge>
                  )}
                </Flex>
              </Box>

              {semesters.map((semester) => {
                const courses =
                  semester.courses ?? [];

                if (!courses.length) {
                  return null;
                }

                return (
                  <Box
                    key={`${semester.yearNumber}-${semester.semesterNumber}`}
                  >
                    <Flex
                      align="center"
                      gap={3}
                      mb={6}
                    >
                      <Flex
                        w="48px"
                        h="48px"
                        bg="var(--public-surface-alt)"
                        color={accent}
                        borderRadius="xl"
                        justify="center"
                        align="center"
                      >
                        <FiLayers size={23} />
                      </Flex>

                      <Box>
                        <Heading
                          size="lg"
                          color="var(--public-text)"
                        >
                          Year {semester.yearNumber}
                          {" · "}
                          Semester {semester.semesterNumber}
                        </Heading>

                        <Text
                          color={muted}
                          fontSize="sm"
                          mt={1}
                        >
                          {courses.length} courses
                        </Text>
                      </Box>
                    </Flex>

                    <SimpleGrid
                      columns={{
                        base: 1,
                        md: 2,
                        xl: 3,
                      }}
                      gap={5}
                    >
                      {courses.map((course) => (
                        <CourseCard
                          key={course._id}
                          course={course}
                          programId={programId}
                        />
                      ))}
                    </SimpleGrid>
                  </Box>
                );
              })}
            </VStack>
          )}
        </Container>
      </Box>
    </>
  );
}
