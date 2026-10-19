
import { useEffect, useState } from "react";

import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Link,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useThemeMode } from "../../context/ThemeContext.jsx";

import { entranceService } from "../../services/entrance.service.js";

// ==================================================
// CONFIGURATION
// ==================================================

const YEAR = "current";
const THEMES = {
  light: {
    background: "#ffffff",
    surface: "#f5f7fa",
    heading: "#17365d",
    text: "#263445",
    muted: "#536273",
    accent: "#a67c32",
    border: "#dce3eb",
    button: "#17365d",
    buttonHover: "#254d7b",
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
    button: "#345f91",
    buttonHover: "#4578ae",
    error: "#ffaaa5",
  },
};

// ==================================================
// HELPERS
// ==================================================

const formatDate = (value) => {
  if (!value) return "Not announced";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not announced";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const sortByOrder = (items) => {
  if (!Array.isArray(items)) return [];

  return [...items].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
};

const isSafePdfUrl = (value) => {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);

    return url.protocol === "https:";
  } catch {
    return false;
  }
};

// ==================================================
// ANNOUNCEMENT HEADER
// ==================================================

function AnnouncementHeader({ title, academicYear, colors }) {
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
          fontWeight="semibold"
          fontSize={{ base: "sm", md: "md" }}
          textAlign="center"
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
        {title}
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
// SECTION HEADING
// ==================================================

function SectionHeading({ children, colors }) {
  return (
    <Heading
      as="h2"
      color={colors.heading}
      fontSize={{ base: "lg", md: "xl" }}
      fontWeight="700"
      lineHeight="1.7"
      mb={5}
    >
      {children}
    </Heading>
  );
}

// ==================================================
// MAIN PAGE
// ==================================================

export default function EntranceInformation() {
  const { theme } = useThemeMode();

  const isDark = theme === "dark";

  const colors = isDark ? THEMES.dark : THEMES.light;

  const [information, setInformation] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  // ==================================================
  // FETCH PUBLIC INFORMATION
  // ==================================================

  useEffect(() => {
    let active = true;

    const loadInformation = async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await entranceService.getPublicInformation(YEAR);

        if (!active) return;

        setInformation(result?.information ?? null);

        setAcademicYear(result?.academicYear ?? null);
      } catch (err) {
        if (!active) return;

        setInformation(null);
        setAcademicYear(null);

        setError(
          err.response?.status === 404
            ? "Entrance information has not been published yet."
            : err.response?.data?.message ||
                "Unable to load entrance information."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadInformation();

    return () => {
      active = false;
    };
  }, [retry]);

  // ==================================================
  // DERIVED DATA
  // ==================================================

  const requirements = sortByOrder(
    information?.requirements
  );

  const awards = sortByOrder(
    information?.awards
  );

  const application = information?.application;

  const pdfUrl = isSafePdfUrl(application?.pdfUrl)
    ? application.pdfUrl
    : null;

  const academicYearName =
    typeof academicYear === "string"
      ? academicYear
      : academicYear?.name ?? academicYear?.code ?? "";

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
        {loading ? (
          <HStack
            justify="center"
            py={24}
            gap={4}
          >
            <Spinner color={colors.heading} />

            <Text color={colors.text}>
              Loading entrance information...
            </Text>
          </HStack>
        ) : error ? (
          <VStack
            py={20}
            gap={5}
            align="center"
          >
            <Text
              color={colors.error}
              textAlign="center"
            >
              {error}
            </Text>

            <Button
              variant="outline"
              borderColor={colors.border}
              color={colors.heading}
              onClick={() => setRetry((n) => n + 1)}
            >
              Try Again
            </Button>
          </VStack>
        ) : !information ? (
          <Text
            py={20}
            textAlign="center"
            color={colors.muted}
          >
            No entrance information available.
          </Text>
        ) : (
          <>
            <AnnouncementHeader
              title={information.title}
              academicYear={academicYearName}
              colors={colors}
            />

            <VStack
              align="stretch"
              gap={{ base: 8, md: 11 }}
              fontSize={{ base: "md", md: "lg" }}
              lineHeight="2.1"
            >
              {/* DESCRIPTION */}

              {information.description && (
                <Box
                  as="section"
                  py={{ base: 2, md: 4 }}
                >
                  <Text
                    whiteSpace="pre-wrap"
                    overflowWrap="anywhere"
                    color={colors.text}
                    lineHeight="2.1"
                  >
                    {information.description}
                  </Text>
                </Box>
              )}

              {/* REQUIREMENTS */}

              {requirements.length > 0 && (
                <Box as="section">
                  <SectionHeading colors={colors}>
                    Entrance Requirements
                  </SectionHeading>

                  <VStack
                    align="stretch"
                    gap={6}
                  >
                    {requirements.map((item, index) => (
                      <Box
                        key={item._id ?? index}
                        borderBottomWidth="1px"
                        borderColor={colors.border}
                        pb={5}
                      >
                        <Text
                          fontWeight="700"
                          color={colors.heading}
                          lineHeight="1.9"
                          overflowWrap="anywhere"
                        >
                          {index + 1}. {item.title}
                        </Text>

                        <Text
                          mt={2}
                          pl={{ base: 3, md: 6 }}
                          color={colors.text}
                          whiteSpace="pre-wrap"
                          overflowWrap="anywhere"
                          lineHeight="2.1"
                        >
                          {item.description}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* AWARDS */}

              {awards.length > 0 && (
                <Box as="section">
                  <SectionHeading colors={colors}>
                    Awards, Degrees & Diplomas
                  </SectionHeading>

                  <VStack
                    align="stretch"
                    gap={6}
                  >
                    {awards.map((award, index) => (
                      <Box
                        key={award._id ?? index}
                        borderBottomWidth="1px"
                        borderColor={colors.border}
                        pb={5}
                      >
                        <Text
                          fontWeight="700"
                          color={colors.heading}
                          lineHeight="1.9"
                          overflowWrap="anywhere"
                        >
                          {index + 1}. {award.awardTitle}
                        </Text>

                        {award.description && (
                          <Text
                            mt={2}
                            pl={{ base: 3, md: 6 }}
                            color={colors.text}
                            whiteSpace="pre-wrap"
                            overflowWrap="anywhere"
                            lineHeight="2.1"
                          >
                            {award.description}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* APPLICATION DATES */}

           
              {/* APPLICATION PDF */}

              {pdfUrl && (
                <Box as="section">
                  <SectionHeading colors={colors}>
                    Application Form
                  </SectionHeading>

                  <Box
                    bg={colors.surface}
                    borderWidth="1px"
                    borderColor={colors.border}
                    borderRadius="lg"
                    p={{ base: 5, md: 6 }}
                  >
                    <Text
                      color={colors.text}
                      mb={4}
                      overflowWrap="anywhere"
                    >
                      {application.fileName ||
                        "Application Form.pdf"}
                    </Text>

                    <Button
                      asChild
                      bg={colors.button}
                      color="#ffffff"
                      _hover={{
                        bg: colors.buttonHover,
                      }}
                    >
                      <Link
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Application PDF
                      </Link>
                    </Button>
                  </Box>
                </Box>
              )}
            </VStack>
          </>
        )}
      </Container>
    </Box>
  );
}
