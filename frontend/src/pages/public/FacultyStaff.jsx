import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  Image,
  VStack,
  HStack,
  Spinner,
  Button,
} from "@chakra-ui/react";
import { FaGraduationCap } from "react-icons/fa";
import { Link as RouterLink } from "react-router-dom";

import PageHero from "../../components/common/PageHero.jsx";
import { facultyMemberService } from "../../services/facultyMember.service.js";

export default function FacultyStaff() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadFaculty() {
      try {
        const data = await facultyMemberService.getPublic({
          signal: controller.signal,
        });

        if (active) {
          setMembers(data.members || []);
        }
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError("Unable to load faculty profiles.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFaculty();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <>
      <PageHero
        title="Faculties & Staff"
        description="Meet the academic and administrative team dedicated to excellence at ACC."
      />

      <Box
        bg="var(--public-bg)"
        color="var(--public-text)"
        py={{ base: 10, md: 16 }}
      >
        <Container maxW="1280px">
          <VStack gap={3} mb={10} textAlign="center">
            <Text
              color="var(--public-accent)"
              fontWeight="bold"
              fontSize="sm"
              letterSpacing="widest"
              textTransform="uppercase"
            >
              Our People
            </Text>

            <Heading
              size={{ base: "xl", md: "2xl" }}
              color="var(--public-text)"
            >
              Meet Our Professional Team
            </Heading>

            <Text color="var(--public-muted)" maxW="650px" lineHeight="1.8">
              Our dedicated educators and staff work together to provide quality
              education, practical knowledge and a supportive learning
              environment.
            </Text>
          </VStack>

          {loading && (
            <HStack justify="center" py={12}>
              <Spinner color="var(--public-accent)" size="lg" />
              <Text color="var(--public-muted)">Loading faculty...</Text>
            </HStack>
          )}

          {error && (
            <Text textAlign="center" color="red.600" py={8}>
              {error}
            </Text>
          )}

          {!loading && !error && members.length === 0 && (
            <Text textAlign="center" color="var(--public-muted)" py={10}>
              No faculty profiles are currently available.
            </Text>
          )}

          {!loading && !error && (
            <SimpleGrid columns={{ base: 1, sm: 1, md: 2, lg: 4 }} gap={6}>
              {members.map((person) => (
                <Box
                  key={person._id}
                  as={RouterLink}
                  to={`/faculties-staff/${person._id}`}
                  display="block"
                  bg="var(--public-surface)"
                  color="var(--public-text)"
                  border="1px solid"
                  borderColor="var(--public-border)"
                  borderRadius="2xl"
                  overflow="hidden"
                  textDecoration="none"
                  transition="all 0.2s ease"
                  _hover={{
                    borderColor: "var(--public-accent)",
                    shadow: "lg",
                    transform: "translateY(-4px)",
                  }}
                  _focusVisible={{
                    outline: "3px solid",
                    outlineColor: "var(--public-accent)",
                    outlineOffset: "3px",
                  }}
                >
                  <Box
                    h="220px"
                    bg="var(--public-surface-alt)"
                    overflow="hidden"
                  >
                    {person.image ? (
                      <Image
                        src={person.image}
                        alt={person.name}
                        w="100%"
                        h="100%"
                        objectFit="cover"
                        objectPosition="center 30%"
                        loading="lazy"
                      />
                    ) : (
                      <HStack
                        justify="center"
                        h="100%"
                        color="var(--public-muted)"
                      >
                        <FaGraduationCap size={55} />
                      </HStack>
                    )}
                  </Box>

                  <VStack align="stretch" gap={4} p={5}>
                    <Box>
                      <Heading size="md" color="var(--public-text)" mb={3}>
                        {person.name}
                      </Heading>

                      <Box
                        display="inline-flex"
                        px={3}
                        py={1.5}
                        borderRadius="full"
                        bg="var(--public-surface-alt)"
                        color="var(--public-accent)"
                        fontSize="sm"
                        fontWeight="semibold"
                      >
                        {person.position}
                      </Box>
                    </Box>

                    <HStack align="start" gap={3} color="var(--public-muted)">
                      <FaGraduationCap color="var(--public-accent)" size={16} />

                      <Text fontSize="sm" fontWeight="medium">
                        {person.department}
                      </Text>
                    </HStack>

                    {person.bio && (
                      <Text
                        color="var(--public-muted)"
                        fontSize="sm"
                        lineClamp={3}
                      >
                        {person.bio}
                      </Text>
                    )}
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Container>
      </Box>
    </>
  );
}
