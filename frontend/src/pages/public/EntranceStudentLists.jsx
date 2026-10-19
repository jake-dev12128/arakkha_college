
import { useEffect, useState } from "react";

import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useThemeMode } from "../../context/ThemeContext.jsx";

import { entranceService } from "../../services/entrance.service.js";

// ==================================================
// CONFIGURATION
// ==================================================

const YEAR = "current";
const LIMIT = 20;

const THEMES = {
  light: {
    background: "#ffffff",
    surface: "#f5f7fa",
    heading: "#17365d",
    text: "#263445",
    muted: "#536273",
    accent: "#a67c32",
    border: "#dce3eb",
    tableHeader: "#eaf0f6",
    rowHover: "#f3f7fb",
    button: "#17365d",
    error: "#b42318",
  },

  dark: {
    background: "#101820",
    surface: "#1b2733",
    heading: "#b8d7ff",
    text: "#e7edf5",
    muted: "#b0bdcb",
    accent: "#e1b965",
    border: "#344657",
    tableHeader: "#26394b",
    rowHover: "#233546",
    button: "#b8d7ff",
    error: "#ffaaa5",
  },
};

// ==================================================
// ANNOUNCEMENT HEADER
// ==================================================

function AnnouncementHeader({
  title,
  academicYear,
  colors,
}) {
  return (
    <VStack
      align="center"
      gap={5}
      pt={{ base: 10, md: 16 }}
      pb={{ base: 8, md: 12 }}
    >
      {academicYear && (
        <Text
          color={colors.muted}
          textAlign="center"
          fontWeight="semibold"
        >
          {academicYear}
        </Text>
      )}

      <Heading
        as="h1"
        color={colors.heading}
        fontSize={{
          base: "xl",
          sm: "2xl",
          md: "3xl",
        }}
        fontWeight="800"
        lineHeight="1.8"
        textAlign="center"
        whiteSpace="pre-wrap"
        overflowWrap="anywhere"
        maxW="1000px"
      >
        {title || "Entrance Student Lists"}
      </Heading>

      <Box
        width="130px"
        height="3px"
        bg={colors.accent}
      />
    </VStack>
  );
}

// ==================================================
// MAIN PAGE
// ==================================================

export default function EntranceStudentLists() {
  const { theme } = useThemeMode();

  const isDark = theme === "dark";

  const colors = isDark ? THEMES.dark : THEMES.light;

  const [items, setItems] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const totalPages = Math.max(
    1,
    Math.ceil(total / LIMIT)
  );

  // ==================================================
  // FETCH PUBLIC APPLICANTS
  // ==================================================

  useEffect(() => {
    let active = true;

    const loadStudents = async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await entranceService.getPublicApplicants(
            YEAR,
            {
              page,
              limit: LIMIT,
            }
          );

        if (!active) return;

        setItems(
          Array.isArray(result?.items)
            ? result.items
            : []
        );

        setTitle(result?.title ?? "");
        setDescription(result?.description ?? "");

        const year = result?.academicYear;

        setAcademicYear(
          typeof year === "string"
            ? year
            : year?.name ?? year?.code ?? ""
        );

        setTotal(result?.total ?? 0);
      } catch (err) {
        if (!active) return;

        setItems([]);
        setTotal(0);

        setError(
          err.response?.status === 404
            ? "Entrance student list has not been published yet."
            : err.response?.data?.message ||
                "Unable to load entrance student list."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadStudents();

    return () => {
      active = false;
    };
  }, [page, retry]);

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <Box
      minH="100vh"
      bg={colors.background}
      color={colors.text}
      transition="background-color 0.2s, color 0.2s"
    >
      <Container
        maxW="1200px"
        px={{ base: 5, md: 8 }}
        pb={{ base: 12, md: 20 }}
      >
        {loading && items.length === 0 && !error ? (
          <HStack
            justify="center"
            py={24}
            gap={4}
          >
            <Spinner color={colors.heading} />

            <Text color={colors.text}>
              Loading entrance student list...
            </Text>
          </HStack>
        ) : error ? (
          <VStack
            py={20}
            gap={5}
          >
            <Text
              color={colors.error}
              textAlign="center"
            >
              {error}
            </Text>

            <Button
              variant="outline"
              color={colors.heading}
              borderColor={colors.border}
              onClick={() => setRetry((n) => n + 1)}
            >
              Try Again
            </Button>
          </VStack>
        ) : (
          <>
            {/* HEADER */}

            <AnnouncementHeader
              title={title}
              academicYear={academicYear}
              colors={colors}
            />

            {/* DESCRIPTION */}

            {description && (
              <Box
                as="section"
                mb={{ base: 8, md: 12 }}
              >
                <Text
                  color={colors.text}
                  fontSize={{ base: "md", md: "lg" }}
                  lineHeight="2.1"
                  whiteSpace="pre-wrap"
                  overflowWrap="anywhere"
                >
                  {description}
                </Text>
              </Box>
            )}

            {/* STUDENT TABLE */}

            <Box as="section">
              <Heading
                as="h2"
                color={colors.heading}
                fontSize={{ base: "lg", md: "xl" }}
                fontWeight="700"
                mb={5}
              >
                Entrance Student Lists
              </Heading>

              <Text
                color={colors.muted}
                fontWeight="medium"
                mb={5}
              >
                Total admitted students: {total}
              </Text>

              {loading ? (
                <HStack
                  justify="center"
                  py={12}
                  gap={3}
                >
                  <Spinner color={colors.heading} />

                  <Text color={colors.text}>
                    Loading students...
                  </Text>
                </HStack>
              ) : items.length === 0 ? (
                <Box
                  bg={colors.surface}
                  borderWidth="1px"
                  borderColor={colors.border}
                  borderRadius="lg"
                  p={8}
                >
                  <Text color={colors.muted}>
                    No admitted students found.
                  </Text>
                </Box>
              ) : (
                <Box
                  overflowX="auto"
                  borderWidth="1px"
                  borderColor={colors.border}
                  borderRadius="lg"
                >
                  <Table.Root
                    size="md"
                    variant="line"
                  >
                    <Table.Header>
                      <Table.Row bg={colors.tableHeader}>
                        <Table.ColumnHeader
                          color={colors.heading}
                          fontWeight="700"
                          minW="65px"
                        >
                          No
                        </Table.ColumnHeader>

                        <Table.ColumnHeader
                          color={colors.heading}
                          fontWeight="700"
                          minW="180px"
                        >
                          Name
                        </Table.ColumnHeader>

                        <Table.ColumnHeader
                          color={colors.heading}
                          fontWeight="700"
                          minW="180px"
                        >
                          NRC Number
                        </Table.ColumnHeader>

                        <Table.ColumnHeader
                          color={colors.heading}
                          fontWeight="700"
                          minW="160px"
                        >
                          Father Name
                        </Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>

                    <Table.Body>
                      {items.map((student, index) => (
                        <Table.Row
                          key={
                            student._id ??
                            `${page}-${index}`
                          }
                          bg={colors.background}
                          _hover={{
                            bg: colors.rowHover,
                          }}
                        >
                          <Table.Cell
                            color={colors.text}
                            borderColor={colors.border}
                          >
                            {student.no ??
                              (page - 1) * LIMIT +
                                index +
                                1}
                          </Table.Cell>

                          <Table.Cell
                            color={colors.text}
                            borderColor={colors.border}
                            whiteSpace="normal"
                            overflowWrap="anywhere"
                          >
                            {student.name}
                          </Table.Cell>

                          <Table.Cell
                            color={colors.muted}
                            borderColor={colors.border}
                          >
                            Not publicly disclosed
                          </Table.Cell>

                          <Table.Cell
                            color={colors.text}
                            borderColor={colors.border}
                            whiteSpace="normal"
                            overflowWrap="anywhere"
                          >
                            {student.fatherName}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              )}

              {/* PAGINATION */}

              <HStack
                mt={7}
                justify="space-between"
                wrap="wrap"
                gap={4}
              >
                <Text
                  color={colors.muted}
                  fontSize="sm"
                >
                  Page {page} of {totalPages}
                </Text>

                <HStack gap={3}>
                  <Button
                    size="sm"
                    variant="outline"
                    color={colors.heading}
                    borderColor={colors.border}
                    disabled={page <= 1 || loading}
                    onClick={() =>
                      setPage((p) => Math.max(1, p - 1))
                    }
                  >
                    Previous
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    color={colors.heading}
                    borderColor={colors.border}
                    disabled={
                      page >= totalPages || loading
                    }
                    onClick={() =>
                      setPage((p) => p + 1)
                    }
                  >
                    Next
                  </Button>
                </HStack>
              </HStack>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}
