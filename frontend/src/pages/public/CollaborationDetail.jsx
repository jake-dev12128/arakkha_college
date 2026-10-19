
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Link,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FaArrowLeft, FaBuilding } from "react-icons/fa";
import {
  Link as RouterLink,
  useParams,
} from "react-router-dom";
import DOMPurify from "dompurify";

import PageHero from "../../components/common/PageHero.jsx";
import { collaborationPartnerService } from "../../services/collaborationPartner.service.js";

const safeWebsite = (value) => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
};

export default function CollaborationDetail() {
  const { id } = useParams();

  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError("");
    setPartner(null);

    async function loadPartner() {
      try {
        const data =
          await collaborationPartnerService.getPublicById(
            id,
            { signal: controller.signal }
          );

        if (active) {
          setPartner(data.partner || null);
        }
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(
            err?.response?.status === 404
              ? "This collaboration profile is not available."
              : "Unable to load collaboration details."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPartner();

    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  const website = safeWebsite(partner?.websiteUrl);

  return (
    <>
      <PageHero
        title="Collaboration Details"
        description="Learn more about our academic and industry partners."
      />

      <Box bg="gray.50" minH="60vh" py={{ base: 10, md: 16 }}>
        <Container maxW="1000px">
          <Button
            as={RouterLink}
            to="/collaboration"
            variant="ghost"
            colorPalette="blue"
            mb={8}
          >
            <FaArrowLeft />
            Back to Collaboration
          </Button>

          {loading && (
            <Flex justify="center" py={16}>
              <Spinner size="lg" color="blue.600" />
            </Flex>
          )}

          {!loading && (error || !partner) && (
            <Box
              p={10}
              bg="white"
              borderRadius="2xl"
              textAlign="center"
            >
              <Heading size="lg">Profile Unavailable</Heading>
              <Text mt={3} color="gray.600">
                {error || "Collaboration partner not found."}
              </Text>
            </Box>
          )}

          {!loading && partner && (
            <Box
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="2xl"
              p={{ base: 6, md: 10 }}
              shadow="sm"
            >
              <VStack gap={7} align="stretch">
                <Flex
                  direction={{ base: "column", md: "row" }}
                  align="center"
                  gap={8}
                >
                  <Flex
                    w="180px"
                    h="180px"
                    borderRadius="full"
                    border="3px solid"
                    borderColor="blue.100"
                    align="center"
                    justify="center"
                    overflow="hidden"
                    flexShrink={0}
                  >
                    {partner.logo ? (
                      <Image
                        src={partner.logo}
                        alt={`${partner.name} logo`}
                        w="100%"
                        h="100%"
                        objectFit="contain"
                      />
                    ) : (
                      <FaBuilding size={65} color="#94a3b8" />
                    )}
                  </Flex>

                  <Box
                    flex="1"
                    textAlign={{ base: "center", md: "left" }}
                  >
                    <Text
                      color="blue.600"
                      fontWeight="bold"
                      mb={2}
                    >
                      {partner.type}
                    </Text>

                    <Heading size="2xl" color="gray.800">
                      {partner.name}
                    </Heading>

                    {partner.shortDescription && (
                      <Text
                        mt={4}
                        color="gray.600"
                        lineHeight="1.9"
                        whiteSpace="pre-wrap"
                      >
                        {partner.shortDescription}
                      </Text>
                    )}

                    {website && (
                      <Link
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="blue.600"
                        mt={4}
                        display="inline-block"
                      >
                        Visit Official Website
                      </Link>
                    )}

                    {partner.email && (
                      <Text mt={3} color="gray.600">
                        Email:{" "}
                        <Link
                          href={`mailto:${partner.email}`}
                          color="blue.600"
                        >
                          {partner.email}
                        </Link>
                      </Text>
                    )}
                  </Box>
                </Flex>

                {partner.description && (
                  <Box
                    borderTopWidth="1px"
                    borderColor="gray.200"
                    pt={8}
                  >
                    <Heading size="lg" mb={5} color="gray.800">
                      About Our Collaboration
                    </Heading>

                    <Box
                      color="gray.700"
                      lineHeight="1.9"
                      css={{
                        "& p": { marginBottom: "1rem" },
                        "& h2, & h3": {
                          fontWeight: "bold",
                          marginBottom: "0.75rem",
                          marginTop: "1.5rem",
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
                          color: "#2563eb",
                          textDecoration: "underline",
                        },
                      }}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          partner.description
                        ),
                      }}
                    />
                  </Box>
                )}
              </VStack>
            </Box>
          )}
        </Container>
      </Box>
    </>
  );
}
