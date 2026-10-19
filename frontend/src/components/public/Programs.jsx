
import { useEffect, useState } from "react";

import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { Link as RouterLink } from "react-router-dom";
import { FiArrowUpRight, FiClock } from "react-icons/fi";

import SectionTitle from "../common/SectionTitle.jsx";

import {
  getPublicPrograms,
} from "../../services/publicAcademic.service.js";

import { truncateText } from "../../utils/truncateText.js";

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchPrograms = async () => {
      try {
        const result = await getPublicPrograms(
          controller.signal
        );

        if (!controller.signal.aborted) {
          setPrograms(
            (result.programs ?? []).slice(0, 3)
          );
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError("Unable to load programs.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchPrograms();

    return () => controller.abort();
  }, []);

  return (
    <Box
      py={{ base: 14, md: 20 }}
      bg="var(--public-bg)"
      color="var(--public-text)"
    >
      <Container maxW="1280px">
        <SectionTitle
          eyebrow="Academic"
          title="Programs"
          description="Discover programs designed to build practical and professional technology skills."
        />

        {loading ? (
          <Flex justify="center" py={12}>
            <Spinner
              size="lg"
              color="var(--public-accent)"
            />
          </Flex>
        ) : error ? (
          <Text color="red.500">{error}</Text>
        ) : programs.length === 0 ? (
          <Text
            textAlign="center"
            color="var(--public-muted)"
            py={10}
          >
            No published programs available.
          </Text>
        ) : (
          <SimpleGrid
            columns={{ base: 1, md: 2, lg: 3 }}
            gap={6}
            alignItems="stretch"
          >
            {programs.map((program) => (
              <Box
                key={program._id}
                display="flex"
                flexDirection="column"
                minW={0}
                h="100%"
                borderWidth="1px"
                borderColor="var(--public-border)"
                borderRadius="2xl"
                overflow="hidden"
                bg="var(--public-surface)"
                color="var(--public-text)"
                transition="all 0.25s ease"
                _hover={{
                  transform: "translateY(-5px)",
                  borderColor: "var(--public-accent)",
                  boxShadow:
                    "0 16px 35px rgba(0,0,0,0.12)",
                }}
              >
                {/* PROGRAM IMAGE */}

                <Box
                  position="relative"
                  h="200px"
                  overflow="hidden"
                  bg="var(--public-surface-alt)"
                >
                  {program.imageUrl ? (
                    <Image
                      src={program.imageUrl}
                      alt={program.name}
                      w="100%"
                      h="100%"
                      objectFit="cover"
                      loading="lazy"
                    />
                  ) : (
                    <Flex
                      h="100%"
                      align="center"
                      justify="center"
                    >
                      <Heading
                        size="xl"
                        color="var(--public-accent)"
                      >
                        {program.code ||
                          program.name.charAt(0)}
                      </Heading>
                    </Flex>
                  )}
                </Box>

                {/* PROGRAM CONTENT */}

                <VStack
                  align="stretch"
                  gap={4}
                  p={{ base: 5, md: 6 }}
                  flex="1"
                >
                  <Flex
                    justify="space-between"
                    align="center"
                    gap={3}
                    wrap="wrap"
                  >
                    <Box
                      px={3}
                      py={1}
                      borderRadius="full"
                      bg="var(--public-surface-alt)"
                      color="var(--public-accent)"
                      fontSize="xs"
                      fontWeight="bold"
                      textTransform="uppercase"
                    >
                      {program.type}
                    </Box>

                    <Flex
                      align="center"
                      gap={1.5}
                      color="var(--public-muted)"
                      fontSize="xs"
                    >
                      <FiClock />

                      <Text>
                        {program.durationYears}{" "}
                        {program.durationYears === 1
                          ? "Year"
                          : "Years"}
                      </Text>
                    </Flex>
                  </Flex>

                  <Heading
                    size="lg"
                    color="var(--public-text)"
                    lineHeight="1.4"
                  >
                    {program.name}
                  </Heading>

                  <Text
                    color="var(--public-muted)"
                    fontSize="sm"
                    lineHeight="1.8"
                    overflowWrap="anywhere"
                  >
                    {truncateText(
                      program.description ||
                        "Explore this academic program.",
                      150
                    )}
                  </Text>

                  {/* CARD ACTION */}

                  <Box mt="auto" pt={3}>
                    <Box
                      h="1px"
                      bg="var(--public-border)"
                      mb={4}
                    />

                    <Button
                      as={RouterLink}
                      to={`/academic/courses/${program._id}`}
                      variant="ghost"
                      color="var(--public-accent)"
                      w="100%"
                      justifyContent="space-between"
                      px={0}
                      _hover={{
                        bg: "var(--public-surface-alt)",
                        px: 3,
                      }}
                    >
                      View Courses
                      <FiArrowUpRight />
                    </Button>
                  </Box>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}

        {/* EXPLORE ALL PROGRAMS */}

        <Box textAlign="center" mt={10}>
          <Button
            as={RouterLink}
            to="/programs"
            colorPalette="blue"
            size="lg"
            borderRadius="xl"
          >
            Explore All Programs
            <FiArrowUpRight />
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
