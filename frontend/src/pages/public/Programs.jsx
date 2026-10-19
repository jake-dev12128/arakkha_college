
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { Link as RouterLink } from "react-router-dom";
import { FiArrowUpRight, FiClock } from "react-icons/fi";

import PageHero from "../../components/common/PageHero.jsx";
import { getPublicPrograms } from "../../services/publicAcademic.service.js";
import { truncateText } from "../../utils/truncateText.js";

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchPrograms = async () => {
      try {
        setLoading(true);
        setError("");

        const result = await getPublicPrograms(controller.signal);

        if (!controller.signal.aborted) {
          setPrograms(result.programs ?? []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.message ||
              "Failed to load programs."
          );
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
    <>
      <PageHero
        title="Programs"
        description="Explore academic and professional programs offered by ACC Computer College."
      />

      <Container
        maxW="1280px"
        py={{ base: 10, md: 16 }}
      >
        {loading ? (
          <VStack py={16} gap={4}>
            <Spinner
              size="xl"
              color="var(--public-accent)"
            />
            <Text color="var(--public-muted)">
              Loading programs...
            </Text>
          </VStack>
        ) : error ? (
          <Box textAlign="center" py={12}>
            <Text color="red.500">{error}</Text>
          </Box>
        ) : programs.length === 0 ? (
          <Box textAlign="center" py={16}>
            <Heading
              size="md"
              color="var(--public-text)"
            >
              No Programs Available
            </Heading>

            <Text mt={3} color="var(--public-muted)">
              There are currently no published programs.
            </Text>
          </Box>
        ) : (
          <Flex
            justify="center"
            align="stretch"
            wrap="wrap"
            gap={6}
          >
            {programs.map((program) => (
              <Box
                key={program._id}
                flex={{
                  base: "0 1 100%",
                  sm: "0 1 calc(50% - 12px)",
                  lg: "0 1 calc(33.333% - 16px)",
                }}
                minW={0}
                maxW={{ base: "420px", sm: "none" }}
                display="flex"
                flexDirection="column"
                border="1px solid"
                borderColor="var(--public-border)"
                borderRadius="2xl"
                overflow="hidden"
                bg="var(--public-surface)"
                color="var(--public-text)"
                transition="all 0.25s ease"
                _hover={{
                  transform: "translateY(-5px)",
                  borderColor: "var(--public-accent)",
                  boxShadow: "0 16px 35px rgba(0,0,0,0.12)",
                }}
              >
                {/* IMAGE */}

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
                      bg="var(--public-surface-alt)"
                    >
                      <Heading
                        size="xl"
                        color="var(--public-accent)"
                      >
                        {program.code}
                      </Heading>
                    </Flex>
                  )}

                  <Box
                    position="absolute"
                    bottom={0}
                    left={0}
                    right={0}
                    h="50px"
                    bgGradient="to-t"
                    gradientFrom="rgba(0,0,0,0.35)"
                    gradientTo="transparent"
                    pointerEvents="none"
                  />
                </Box>

                {/* CONTENT */}

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

                  {/* FOOTER ACTION */}

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
                      width="100%"
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
          </Flex>
        )}
      </Container>
    </>
  );
}
