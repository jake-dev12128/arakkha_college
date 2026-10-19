
import { useEffect, useMemo, useState } from "react";

import {
  Box,
  Container,
  Grid,
  GridItem,
  Heading,
  Image,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import DOMPurify from "dompurify";

import PageHero from "../../components/common/PageHero.jsx";
import SectionTitle from "../../components/common/SectionTitle.jsx";
import { aboutService } from "../../services/about.service.js";

// ==================================================
// STATIC IMAGES
// ==================================================

const VISION_IMAGE = "/img/coll.jpg";
const MISSION_IMAGE = "/img/c3.jpg";

// ==================================================
// SAFE RICH TEXT
// ==================================================

function RichText({
  html,
  color = "var(--public-text)",
  textAlign = "left",
}) {
  const safeHtml = useMemo(
    () => DOMPurify.sanitize(html || ""),
    [html]
  );

  return (
    <Box
      width="100%"
      maxW="none"
      minW="0"
      color={color}
      textAlign={textAlign}
      lineHeight="1.9"
      overflowWrap="break-word"
      css={{
        "& p": {
          width: "100%",
          maxWidth: "none",
          marginBottom: "16px",
        },

        "& h1": {
          fontSize: "2xl",
          fontWeight: "bold",
          marginBottom: "12px",
        },

        "& h2": {
          fontSize: "xl",
          fontWeight: "bold",
          marginBottom: "10px",
        },

        "& h3": {
          fontSize: "lg",
          fontWeight: "semibold",
          marginBottom: "8px",
        },

        "& ul": {
          paddingLeft: "24px",
          listStyleType: "disc",
          marginBottom: "12px",
        },

        "& ol": {
          paddingLeft: "24px",
          listStyleType: "decimal",
          marginBottom: "12px",
        },

        "& li": {
          marginBottom: "6px",
        },

        "& a": {
          color: "var(--public-accent)",
          textDecoration: "underline",
        },

        "& blockquote": {
          borderLeft: "3px solid",
          borderColor: "var(--public-accent)",
          paddingLeft: "16px",
          fontStyle: "italic",
          marginY: "12px",
        },

        "& img": {
          maxWidth: "100%",
          height: "auto",
        },
      }}
      dangerouslySetInnerHTML={{
        __html: safeHtml,
      }}
    />
  );
}

// ==================================================
// VISION / MISSION FEATURE
// ==================================================

function AboutFeature({
  title,
  description,
  image,
  imageAlt,
  reverse = false,
}) {
  return (
    <Grid
      templateColumns={{
        base: "minmax(0, 1fr)",
        md: "repeat(2, minmax(0, 1fr))",
      }}
      gap={{ base: 6, md: 10 }}
      alignItems="center"
      width="100%"
    >
      {/* STATIC IMAGE */}

      <GridItem
        minW="0"
        order={{
          base: 1,
          md: reverse ? 2 : 1,
        }}
      >
        <Box
          width="100%"
          overflow="hidden"
          borderRadius="2xl"
          boxShadow="md"
        >
          <Image
            src={image}
            alt={imageAlt}
            width="100%"
            height={{
              base: "240px",
              md: "320px",
            }}
            objectFit="cover"
            loading="lazy"
          />
        </Box>
      </GridItem>

      {/* CONTENT */}

      <GridItem
        minW="0"
        order={{
          base: 2,
          md: reverse ? 1 : 2,
        }}
      >
        <Heading
          size="xl"
          mb="5"
          color="var(--public-text)"
        >
          {title}
        </Heading>

        <RichText html={description} />
      </GridItem>
    </Grid>
  );
}

// ==================================================
// ABOUT PAGE
// ==================================================

export default function About() {
  const [about, setAbout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==================================================
  // FETCH PUBLISHED ABOUT
  // ==================================================

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadAbout = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await aboutService.getPublic({
          signal: controller.signal,
        });

        if (active) {
          setAbout(data || null);
        }
      } catch (err) {
        if (!active || controller.signal.aborted) {
          return;
        }

        if (err?.response?.status === 404) {
          setAbout(null);
        } else {
          setError(
            "Unable to load About Us content. Please try again later."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadAbout();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <Container maxW="1280px" py="24">
        <VStack gap="4">
          <Spinner
            size="xl"
            color="var(--public-accent)"
          />

          <Text color="var(--public-muted)">
            Loading About Us...
          </Text>
        </VStack>
      </Container>
    );
  }

  // ==================================================
  // ERROR
  // ==================================================

  if (error) {
    return (
      <>
        <PageHero
          title="About Us"
          description="ACC Computer College"
        />

        <Container maxW="1280px" py="20">
          <Box role="alert">
            <Text color="red.600">
              {error}
            </Text>
          </Box>
        </Container>
      </>
    );
  }

  // ==================================================
  // UNPUBLISHED / NOT FOUND
  // ==================================================

  if (!about) {
    return (
      <>
        <PageHero
          title="About Us"
          description="ACC Computer College"
        />

        <Container maxW="1280px" py="20">
          <Text color="var(--public-muted)">
            About Us information is currently unavailable.
          </Text>
        </Container>
      </>
    );
  }

  // ==================================================
  // PUBLIC CONTENT
  // ==================================================

  return (
    <>
      {/* ==========================================
          HERO SECTION
      ========================================== */}

      <PageHero
        title={about.hero?.title || "About Us"}
        description={about.hero?.description || ""}
      />

      {/* ==========================================
          WHO WE ARE — FULL WIDTH
      ========================================== */}

      {/* WHO WE ARE */}

      <Box
        as="section"
        width="100%"
        py={{ base: 14, md: 20 }}
        bg="var(--public-bg)"
        color="var(--public-text)"
      >
        <Container maxW="1280px" width="100%">
          <SectionTitle
            eyebrow={about.introduction?.eyebrow || ""}
            title={about.introduction?.title || ""}
          />

          <Box
            mt="6"
            width="100%"
            maxWidth="none"
            css={{
              "& p": {
                maxWidth: "none !important",
                width: "100% !important",
                whiteSpace: "normal !important",
              },
              "& div": {
                maxWidth: "none !important",
              },
            }}
          >
            <RichText
              html={about.introduction?.description}
              color="var(--public-muted)"
            />
          </Box>
        </Container>
      </Box>

      {/* ==========================================
          VISION SECTION
      ========================================== */}

      <Box
        as="section"
        width="100%"
        bg="var(--public-surface-alt)"
        color="var(--public-text)"
        py={{ base: "14", md: "20" }}
      >
        <Container
          maxW="1280px"
          width="100%"
        >
          <AboutFeature
            title={
              about.vision?.title || "Our Vision"
            }
            description={
              about.vision?.description
            }
            image={VISION_IMAGE}
            imageAlt="ACC Computer College Vision"
          />
        </Container>
      </Box>

      {/* ==========================================
          MISSION SECTION
      ========================================== */}

      <Box
        as="section"
        width="100%"
        bg="var(--public-bg)"
        color="var(--public-text)"
        py={{ base: "14", md: "20" }}
      >
        <Container
          maxW="1280px"
          width="100%"
        >
          <AboutFeature
            title={
              about.mission?.title || "Our Mission"
            }
            description={
              about.mission?.description
            }
            image={MISSION_IMAGE}
            imageAlt="ACC Computer College Mission"
            reverse
          />
        </Container>
      </Box>
    </>
  );
}
