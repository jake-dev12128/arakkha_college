
import { useEffect, useState } from "react";

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

import PageHero from "../../components/common/PageHero.jsx";

import {
  getPublishedProgramCourses,
} from "../../services/publicAcademic.service.js";

export default function Courses() {
  const { programId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadCourses = async () => {
      try {
        setLoading(true);
        setError("");
        setData(null);

        const result = await getPublishedProgramCourses(
          programId,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.message ||
              "Failed to load courses."
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

  return (
    <>
      <PageHero
        title={data?.program?.name ?? "Program Courses"}
        description="Discover what you will study, organized by academic year and semester."
      />

      <Container maxW="1440px" py={{ base: 8, md: 14 }}>
        <Button
          as={RouterLink}
          to="/programs"
          variant="outline"
          mb={8}
        >
          ← Back to Programs
        </Button>

        {loading ? (
          <VStack py={16} gap={4}>
            <Spinner size="xl" />
            <Text>Loading courses...</Text>
          </VStack>
        ) : error ? (
          <Box textAlign="center" py={12}>
            <Text color="red.500">{error}</Text>
          </Box>
        ) : !data?.curriculum ? (
          <Box textAlign="center" py={16}>
            <Heading size="lg">
              Course Information Coming Soon
            </Heading>
            <Text mt={3} color="fg.muted">
              The course structure for this program
              has not been published yet.
            </Text>
          </Box>
        ) : (
          <VStack align="stretch" gap={12}>
            {/* PROGRAM OVERVIEW */}
            <Box
              borderWidth="1px"
              borderRadius="2xl"
              p={{ base: 5, md: 8 }}
              bg="bg.panel"
            >
              <Text
                color="blue.500"
                fontWeight="bold"
                fontSize="sm"
              >
                PROGRAM OVERVIEW
              </Text>

              <Heading size="xl" mt={2}>
                {data.program?.name}
              </Heading>

              <Text mt={3} color="fg.muted">
                The subjects below are organized by
                year and semester so you can see
                what you will learn throughout
                the program.
              </Text>

              <Flex gap={3} mt={5} wrap="wrap">
                <Badge variant="subtle" colorPalette="blue">
                  {data.totalCourses ?? 0} Subjects
                </Badge>

                {data.program?.code && (
                  <Badge variant="outline">
                    Program: {data.program.code}
                  </Badge>
                )}
              </Flex>
            </Box>

            {/* SEMESTERS */}
            {(data.semesters ?? []).map((semester) => (
              <Box
                key={`${semester.yearNumber}-${semester.semesterNumber}`}
              >
                <Box textAlign="center" mb={7}>
                  <Text
                    color="blue.500"
                    fontWeight="bold"
                    fontSize="sm"
                  >
                    STUDY PLAN
                  </Text>

                  <Heading size="lg" mt={2}>
                    Year {semester.yearNumber}
                    {" · "}
                    Semester {semester.semesterNumber}
                  </Heading>

                  <Text mt={2} color="fg.muted">
                    {(semester.courses ?? []).length} subjects
                    in this semester
                  </Text>
                </Box>

                {(semester.courses ?? []).length === 0 ? (
                  <Text textAlign="center" color="fg.muted">
                    No subjects are currently listed
                    for this semester.
                  </Text>
                ) : (
                  <Flex
                    justify="center"
                    align="stretch"
                    wrap="wrap"
                    gap={5}
                  >
                    {semester.courses.map((course) => (
                      <Box
                        key={course._id}
                        flex={{
                          base: "0 1 100%",
                          sm: "0 1 calc(50% - 10px)",
                          lg: "0 1 calc(25% - 15px)",
                        }}
                        minW={0}
                        borderWidth="1px"
                        borderRadius="2xl"
                        p={6}
                        bg="bg.panel"
                        shadow="sm"
                        transition="all 0.2s"
                        _hover={{
                          transform: "translateY(-4px)",
                          shadow: "md",
                        }}
                      >
                        <Badge
                          colorPalette="blue"
                          variant="subtle"
                        >
                          {course.courseType || "Subject"}
                        </Badge>

                        <Heading size="md" mt={4}>
                          {course.title}
                        </Heading>

                        <Text
                          mt={2}
                          fontSize="xs"
                          color="fg.muted"
                        >
                          Subject Code: {course.code || "—"}
                        </Text>

                        <Text
                          mt={4}
                          fontSize="sm"
                          lineHeight="1.8"
                          color="fg.muted"
                        >
                          {course.description ||
                            "Learn the essential knowledge and skills covered in this subject."}
                        </Text>

                        <Box
                          mt={5}
                          pt={4}
                          borderTopWidth="1px"
                        >
                          <Text fontWeight="semibold" fontSize="sm">
                            Study Information
                          </Text>

                          <Text mt={3} fontSize="sm">
                            Credits: {course.credits ?? "—"}
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            Credits represent the academic
                            weight of this subject.
                          </Text>

                          <Text mt={3} fontSize="sm">
                            Theory: {course.lectureHours ?? "—"} hours
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            Classroom learning and lessons
                          </Text>

                          <Text mt={3} fontSize="sm">
                            Practical: {course.practicalHours ?? "—"} hours
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            Hands-on exercises and practice
                          </Text>
                        </Box>
                      </Box>
                    ))}
                  </Flex>
                )}
              </Box>
            ))}
          </VStack>
        )}
      </Container>
    </>
  );
}
