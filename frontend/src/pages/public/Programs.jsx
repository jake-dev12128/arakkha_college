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

import PageHero from "../../components/common/PageHero.jsx";

import {
  getPublicPrograms,
} from "../../services/publicAcademic.service.js";

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

        const result = await getPublicPrograms(
          controller.signal
        );

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
        py={{ base: 8, md: 16 }}
      >
        {loading ? (
          <VStack py={16} gap={4}>
            <Spinner size="xl" color="blue.600" />
            <Text>Loading programs...</Text>
          </VStack>
        ) : error ? (
          <Box textAlign="center" py={12}>
            <Text color="red.500">{error}</Text>
          </Box>
        ) : programs.length === 0 ? (
          <Box textAlign="center" py={16}>
            <Heading size="md">
              No Programs Available
            </Heading>

            <Text mt={3} color="gray.500">
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
        lg: "0 1 calc(25% - 18px)",
      }}
      minW={0}
      borderWidth="1px"
      borderRadius="2xl"
      overflow="hidden"
      bg="white"
      color="gray.800"
    >
                {program.imageUrl ? (
                  <Image
                    src={program.imageUrl}
                    alt={program.name}
                    w="100%"
                    h={{ base: "220px", md: "260px" }}
                    objectFit="cover"
                    loading="lazy"
                  />
                ) : (
                  <Box
                    h={{ base: "220px", md: "260px" }}
                    bg="blue.50"
                    display="grid"
                    placeItems="center"
                  >
                    <Heading color="blue.700">
                      {program.code}
                    </Heading>
                  </Box>
                )}

                <VStack
                  align="stretch"
                  gap={4}
                  p={{ base: 5, md: 7 }}
                >
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    textTransform="uppercase"
                    color="blue.600"
                  >
                    {program.type}
                  </Text>

                  <Heading size="lg">
                    {program.name}
                  </Heading>

                  <Text
                    color="gray.600"
                    lineHeight="1.8"
                  >
                    {program.description ||
                      "Explore this academic program."}
                  </Text>

                  <Text
                    fontSize="sm"
                    color="gray.500"
                  >
                    Duration: {program.durationYears}{" "}
                    {program.durationYears === 1
                      ? "Year"
                      : "Years"}
                  </Text>

                  <Box>
                    <Button
                      as={RouterLink}
                      to={`/academic/courses/${program._id}`}
                      variant="outline"
                      colorPalette="blue"
                    >
                      View Courses
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