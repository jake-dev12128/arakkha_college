
import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Image,
  VStack,
  HStack,
  Button,
  Spinner,
  Flex,
  Link,
} from "@chakra-ui/react";
import {
  FaArrowLeft,
  FaEnvelope,
  FaGlobe,
  FaLinkedin,
  FaGraduationCap,
} from "react-icons/fa";
import {
  Link as RouterLink,
  useParams,
} from "react-router-dom";
import DOMPurify from "dompurify";

import PageHero from "../../components/common/PageHero.jsx";
import { facultyMemberService } from "../../services/facultyMember.service.js";

const safeExternalUrl = (value) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
};

export default function FacultyStaffDetail() {
  const { id } = useParams();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError("");
    setMember(null);

    async function loadDetails() {
      try {
        const data = await facultyMemberService.getPublicById(
          id,
          { signal: controller.signal }
        );

        if (active) {
          setMember(data.member || null);
        }
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(
            err?.response?.status === 404
              ? "This faculty profile is not available."
              : "Unable to load faculty details."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDetails();

    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  const linkedin = safeExternalUrl(member?.linkedinUrl);
  const website = safeExternalUrl(member?.websiteUrl);

  return (
    <>
      <PageHero
        title="Faculty Profile"
        description="Learn more about our academic and administrative team."
      />

      <Box
        bg="var(--public-bg)"
        color="var(--public-text)"
        minH="65vh"
        py={{ base: 10, md: 16 }}
      >
        <Container maxW="1100px">
          <Button
            as={RouterLink}
            to="/faculties-staff"
            variant="ghost"
            colorPalette="blue"
            mb={8}
          >
            <FaArrowLeft />
            Back to Faculties & Staff
          </Button>

          {loading && (
            <Flex justify="center" py={16}>
              <Spinner
                size="lg"
                color="var(--public-accent)"
              />
            </Flex>
          )}

          {!loading && (error || !member) && (
            <Box
              bg="var(--public-surface)"
              color="var(--public-text)"
              p={10}
              borderRadius="2xl"
              textAlign="center"
            >
              <Heading
                size="lg"
                color="var(--public-text)"
              >
                Profile Unavailable
              </Heading>

              <Text
                mt={3}
                color="var(--public-muted)"
              >
                {error || "Faculty profile not found."}
              </Text>
            </Box>
          )}

          {!loading && member && (
            <Box
              bg="var(--public-surface)"
              color="var(--public-text)"
              borderWidth="1px"
              borderColor="var(--public-border)"
              borderRadius="2xl"
              overflow="hidden"
              shadow="sm"
            >
              <Flex
                direction={{ base: "column", md: "row" }}
                align="start"
                gap={{ base: 6, md: 10 }}
                p={{ base: 6, md: 10 }}
              >
                <Box
                  flexShrink={0}
                  w={{ base: "100%", md: "280px" }}
                  h={{ base: "300px", md: "340px" }}
                  bg="var(--public-surface-alt)"
                  borderRadius="xl"
                  overflow="hidden"
                >
                  {member.image ? (
                    <Image
                      src={member.image}
                      alt={member.name}
                      w="100%"
                      h="100%"
                      objectFit="cover"
                    />
                  ) : (
                    <Flex
                      h="100%"
                      align="center"
                      justify="center"
                      color="var(--public-muted)"
                    >
                      <FaGraduationCap size={72} />
                    </Flex>
                  )}
                </Box>

                <VStack
                  align="stretch"
                  gap={5}
                  flex="1"
                  minW={0}
                >
                  <Box>
                    <Text
                      color="var(--public-accent)"
                      fontSize="sm"
                      fontWeight="bold"
                      letterSpacing="wide"
                      textTransform="uppercase"
                      mb={2}
                    >
                      Faculty & Staff
                    </Text>

                    <Heading
                      size={{ base: "xl", md: "2xl" }}
                      color="var(--public-text)"
                    >
                      {member.name}
                    </Heading>

                    <Text
                      mt={3}
                      fontSize="lg"
                      fontWeight="semibold"
                      color="var(--public-accent)"
                    >
                      {member.position}
                    </Text>

                    <Text
                      mt={2}
                      color="var(--public-muted)"
                    >
                      {member.department}
                    </Text>
                  </Box>

                  {member.bio && (
                    <Text
                      color="var(--public-text)"
                      lineHeight="1.9"
                      whiteSpace="pre-wrap"
                    >
                      {member.bio}
                    </Text>
                  )}

                  <HStack gap={3} flexWrap="wrap">
                    {member.email && (
                      <Link
                        href={`mailto:${member.email}`}
                        color="var(--public-accent)"
                      >
                        <FaEnvelope />
                        Email
                      </Link>
                    )}

                    {linkedin && (
                      <Link
                        href={linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="var(--public-accent)"
                      >
                        <FaLinkedin />
                        LinkedIn
                      </Link>
                    )}

                    {website && (
                      <Link
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="var(--public-accent)"
                      >
                        <FaGlobe />
                        Website
                      </Link>
                    )}
                  </HStack>
                </VStack>
              </Flex>

              {member.description && (
                <Box
                  px={{ base: 6, md: 10 }}
                  pb={{ base: 8, md: 12 }}
                >
                  <Box
                    borderTopWidth="1px"
                    borderColor="var(--public-border)"
                    pt={8}
                  >
                    <Heading
                      size="lg"
                      color="var(--public-text)"
                      mb={5}
                    >
                      About {member.name}
                    </Heading>

                    <Box
                      color="var(--public-text)"
                      lineHeight="1.9"
                      css={{
                        "& p": {
                          marginBottom: "1rem",
                        },
                        "& h2, & h3": {
                          fontWeight: "bold",
                          marginTop: "1.5rem",
                          marginBottom: "0.75rem",
                        },
                        "& ul": {
                          listStyleType: "disc",
                          paddingLeft: "1.5rem",
                        },
                        "& ol": {
                          listStyleType: "decimal",
                          paddingLeft: "1.5rem",
                        },
                        "& a": {
                          color: "var(--public-accent)",
                          textDecoration: "underline",
                        },
                        "& img": {
                          maxWidth: "100%",
                          height: "auto",
                        },
                      }}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          member.description
                        ),
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Container>
      </Box>
    </>
  );
}
