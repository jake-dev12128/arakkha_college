
import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Heading,
  Image,
  SimpleGrid,
  Text,
  VStack,
  Spinner,
  Flex,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FaBuilding } from "react-icons/fa";

import PageHero from "../../components/common/PageHero.jsx";
import { collaborationPartnerService } from "../../services/collaborationPartner.service.js";

export default function Collaboration() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadPartners() {
      try {
        const data =
          await collaborationPartnerService.getPublic({
            signal: controller.signal,
          });

        if (active) {
          setPartners(data.partners || []);
        }
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError("Unable to load collaboration partners.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPartners();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <>
      <PageHero
        title="Collaboration"
        description="University, industry and professional collaboration opportunities."
      />

      <Container maxW="1280px" py={{ base: 10, md: 16 }}>
        {loading && (
          <Flex justify="center" py={16}>
            <Spinner
              size="lg"
              color="var(--public-accent)"
            />
          </Flex>
        )}

        {error && (
          <Text color="red.600" textAlign="center" py={10}>
            {error}
          </Text>
        )}

        {!loading && !error && partners.length === 0 && (
          <Text
            color="var(--public-muted)"
            textAlign="center"
            py={10}
          >
            No collaboration partners are currently available.
          </Text>
        )}

        {!loading && !error && (
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={8}>
            {partners.map((partner) => (
              <Box
                key={partner._id}
                as={RouterLink}
                to={`/collaboration/${partner._id}`}
                display="block"
                p={{ base: 6, md: 8 }}
                borderWidth="1px"
                borderColor="var(--public-border)"
                borderRadius="2xl"
                bg="var(--public-surface)"
                color="var(--public-text)"
                textAlign="center"
                textDecoration="none"
                transition="all 0.3s ease"
                _hover={{
                  transform: "translateY(-6px)",
                  shadow: "xl",
                  borderColor: "var(--public-accent)",
                }}
                _focusVisible={{
                  outline: "3px solid",
                  outlineColor: "var(--public-accent)",
                  outlineOffset: "3px",
                }}
              >
                <VStack gap={5}>
                  <Flex
                    w={{ base: "150px", md: "170px" }}
                    h={{ base: "150px", md: "170px" }}
                    borderRadius="full"
                    overflow="hidden"
                    bg="#ffffff"
                    border="3px solid"
                    borderColor="var(--public-border)"
                    boxShadow="0 6px 20px rgba(37,99,235,0.12)"
                    align="center"
                    justify="center"
                  >
                    {partner.logo ? (
                      <Image
                        src={partner.logo}
                        alt={`${partner.name} logo`}
                        w="100%"
                        h="100%"
                        objectFit="contain"
                        loading="lazy"
                      />
                    ) : (
                      <FaBuilding size={55} color="#94a3b8" />
                    )}
                  </Flex>

                  <Box>
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      color="var(--public-accent)"
                      letterSpacing="wide"
                      textTransform="uppercase"
                    >
                      {partner.type}
                    </Text>

                    <Heading
                      size="md"
                      mt={2}
                      color="var(--public-text)"
                    >
                      {partner.name}
                    </Heading>
                  </Box>

                  {partner.shortDescription && (
                    <Text
                      color="var(--public-muted)"
                      lineHeight="1.8"
                      fontSize="sm"
                      lineClamp={4}
                    >
                      {partner.shortDescription}
                    </Text>
                  )}
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Container>
    </>
  );
}
