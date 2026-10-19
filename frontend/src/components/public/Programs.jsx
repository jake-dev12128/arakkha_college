import { useEffect, useState } from "react";

import {
  Box,
  Button,
  Container,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
} from "@chakra-ui/react";

import { Link as RouterLink } from "react-router-dom";

import SectionTitle from "../common/SectionTitle.jsx";

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
      py={{ base: "14", md: "20" }}
      bg="gray.50"
    >
      <Container maxW="1280px">
        <SectionTitle
          eyebrow="Academic"
          title="Programs"
          description="Discover programs designed to build practical and professional technology skills."
        />

        {loading ? (
          <Box textAlign="center" py={10}>
            <Spinner size="lg" />
          </Box>
        ) : error ? (
          <Text color="red.500">
            {error}
          </Text>
        ) : programs.length === 0 ? (
          <Text textAlign="center" color="gray.600">
            No published programs available.
          </Text>
        ) : (
          <SimpleGrid
            columns={{ base: 1, md: 3 }}
            gap="6"
          >
            {programs.map((program) => (
              <Box
                key={program._id}
                p="8"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="2xl"
                bg="white"
                color="gray.800"
              >
                <Box
                  w="12"
                  h="12"
                  borderRadius="xl"
                  bg="blue.50"
                  color="blue.600"
                  display="grid"
                  placeItems="center"
                  fontWeight="900"
                >
                  {program.name.charAt(0)}
                </Box>

                <Heading size="md" mt="6">
                  {program.name}
                </Heading>

                <Text
                  mt="3"
                  color="gray.600"
                  lineHeight="1.8"
                >
                  {program.description ||
                    "Explore this academic program."}
                </Text>

                <Text
                  mt="3"
                  fontSize="sm"
                  color="gray.500"
                >
                  Duration: {program.durationYears}{" "}
                  {program.durationYears === 1
                    ? "Year"
                    : "Years"}
                </Text>

                <Button
                  as={RouterLink}
                  to={`/academic/courses/${program._id}`}
                  mt="6"
                  variant="outline"
                  colorPalette="blue"
                >
                  View Courses
                </Button>
              </Box>
            ))}
          </SimpleGrid>
        )}

        <Box textAlign="center" mt={8}>
          <Button
            as={RouterLink}
            to="/programs"
            colorPalette="blue"
          >
            Explore All Programs
          </Button>
        </Box>
      </Container>
    </Box>
  );
}