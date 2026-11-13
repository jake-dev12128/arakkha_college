
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

import {
  FiDownload,
  FiMaximize2,
  FiMinus,
  FiPlus,
  FiRefreshCw,
} from "react-icons/fi";

import PageHero from "../../components/common/PageHero.jsx";
import organizationChartService from "../../services/organizationChart.service.js";

// ==========================================
// HELPERS
// ==========================================

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const clampZoom = (value) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// ==========================================
// PUBLIC ORGANIZATION CHART
// ==========================================

export default function OrganizationChart() {
  const [chart, setChart] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unpublished, setUnpublished] =
    useState(false);

  const [zoom, setZoom] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // ========================================
  // LOAD PUBLISHED CHART
  // ========================================

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadChart = async () => {
      setLoading(true);
      setError("");
      setUnpublished(false);

      try {
        const data =
          await organizationChartService.getPublic({
            signal: controller.signal,
          });

        if (!active) return;

        if (!data?.imageUrl) {
          setChart(null);
          setUnpublished(true);
          return;
        }

        setChart(data);
        setZoom(1);
      } catch (err) {
        if (!active || controller.signal.aborted) {
          return;
        }

        setChart(null);

        const status = err?.response?.status;
        const code = err?.response?.data?.code;

        if (
          status === 404 &&
          code === "ORGANIZATION_CHART_NOT_PUBLISHED"
        ) {
          setUnpublished(true);
        } else {
          setError(
            "Unable to load the Organization Chart. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadChart();

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  // ========================================
  // ZOOM CONTROLS
  // ========================================

  const zoomIn = () => {
    setZoom((current) =>
      clampZoom(current + ZOOM_STEP)
    );
  };

  const zoomOut = () => {
    setZoom((current) =>
      clampZoom(current - ZOOM_STEP)
    );
  };

  const resetZoom = () => {
    setZoom(1);
  };

  // ========================================
  // OPEN FULL IMAGE
  // ========================================

  const openFullImage = () => {
    if (!chart?.imageUrl) return;

    window.open(
      chart.imageUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // ========================================
  // DOWNLOAD IMAGE
  // ========================================

  const downloadImage = () => {
    if (!chart?.imageUrl) return;

    // Cloudinary is a cross-origin resource.
    // Opening the image lets users save it
    // without relying on the HTML download
    // attribute for cross-origin URLs.
    window.open(
      chart.imageUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // ========================================
  // RELOAD
  // ========================================

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <PageHero
        title="Organization Chart"
        description="Explore the organizational structure of ACC Computer College."
      />

      <Container
        maxW="1280px"
        py={{ base: 10, md: 16 }}
      >
        {/* LOADING */}

        {loading && (
          <Flex
            minH="340px"
            align="center"
            justify="center"
            direction="column"
            gap="4"
          >
            <Spinner
              size="lg"
              color="var(--public-accent)"
            />

            <Text
              color="var(--public-muted)"
              fontSize="sm"
            >
              Loading Organization Chart...
            </Text>
          </Flex>
        )}

        {/* UNPUBLISHED */}

        {!loading && unpublished && (
          <Box
            bg="var(--public-surface)"
            borderWidth="1px"
            borderColor="var(--public-border)"
            borderRadius="xl"
            py={{ base: 12, md: 20 }}
            px="6"
            textAlign="center"
          >
            <VStack gap="4">
              <Heading
                size="lg"
                color="var(--public-text)"
              >
                Organization Chart Coming Soon
              </Heading>

              <Text
                color="var(--public-muted)"
                maxW="560px"
                lineHeight="1.8"
              >
                The official organizational structure
                has not been published yet.
                Please check back later.
              </Text>

              <Button
                onClick={handleRetry}
                colorPalette="blue"
                variant="outline"
              >
                <FiRefreshCw />
                Check Again
              </Button>
            </VStack>
          </Box>
        )}

        {/* ERROR */}

        {!loading && error && (
          <Box
            bg="var(--public-surface)"
            borderWidth="1px"
            borderColor="var(--public-border)"
            borderRadius="xl"
            p="8"
            textAlign="center"
            role="alert"
          >
            <VStack gap="4">
              <Text color="red.500">
                {error}
              </Text>

              <Button
                onClick={handleRetry}
                colorPalette="blue"
                variant="outline"
              >
                <FiRefreshCw />
                Try Again
              </Button>
            </VStack>
          </Box>
        )}

        {/* PUBLISHED CHART */}

        {!loading && !error && chart && (
          <VStack
            align="stretch"
            gap="6"
          >
            {/* TITLE / DESCRIPTION */}

            <Box
              textAlign="center"
              px={{ base: 2, md: 8 }}
            >
              <Heading
                size={{ base: "lg", md: "xl" }}
                color="var(--public-text)"
                mb="3"
              >
                {chart.title || "Organization Chart"}
              </Heading>

              {chart.description && (
                <Text
                  color="var(--public-muted)"
                  lineHeight="1.9"
                  whiteSpace="pre-wrap"
                  maxW="850px"
                  mx="auto"
                >
                  {chart.description}
                </Text>
              )}

              {chart.publishedAt && (
                <Text
                  color="var(--public-muted)"
                  fontSize="xs"
                  mt="4"
                >
                  Published:{" "}
                  {formatDate(chart.publishedAt)}
                </Text>
              )}
            </Box>

            {/* IMAGE VIEWER */}

            <Box
              bg="var(--public-surface)"
              borderWidth="1px"
              borderColor="var(--public-border)"
              borderRadius="xl"
              overflow="hidden"
            >
              {/* TOOLBAR */}

              <Flex
                px={{ base: 3, md: 5 }}
                py="3"
                justify="space-between"
                align="center"
                gap="3"
                flexWrap="wrap"
                borderBottomWidth="1px"
                borderColor="var(--public-border)"
              >
                <Text
                  fontWeight="semibold"
                  fontSize="sm"
                  color="var(--public-text)"
                >
                  Organization Chart Preview
                </Text>

                <Flex
                  align="center"
                  gap="2"
                  flexWrap="wrap"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="gray"
                    onClick={zoomOut}
                    disabled={zoom <= MIN_ZOOM}
                    aria-label="Zoom out"
                  >
                    <FiMinus />
                  </Button>

                  <Text
                    minW="52px"
                    textAlign="center"
                    fontSize="sm"
                    color="var(--public-text)"
                  >
                    {Math.round(zoom * 100)}%
                  </Text>

                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="gray"
                    onClick={zoomIn}
                    disabled={zoom >= MAX_ZOOM}
                    aria-label="Zoom in"
                  >
                    <FiPlus />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="gray"
                    onClick={resetZoom}
                  >
                    Reset
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="blue"
                    onClick={openFullImage}
                  >
                    <FiMaximize2 />
                    Full Image
                  </Button>

                  <Button
                    size="sm"
                    colorPalette="blue"
                    onClick={downloadImage}
                  >
                    <FiDownload />
                    Save Image
                  </Button>
                </Flex>
              </Flex>

              {/* SCROLLABLE IMAGE */}

              <Box
                overflow="auto"
                width="100%"
                maxH="80vh"
                bg="var(--public-surface-alt)"
                p={{ base: 3, md: 6 }}
              >
                <Box
                  width={`${zoom * 100}%`}
                  minW="0"
                  mx="auto"
                  transition="width 0.2s ease"
                >
                  <Image
                    src={chart.imageUrl}
                    alt={
                      chart.title ||
                      "ACC Computer College Organization Chart"
                    }
                    width="100%"
                    height="auto"
                    objectFit="contain"
                    display="block"
                    borderRadius="md"
                    loading="lazy"
                  />
                </Box>
              </Box>
            </Box>

            {/* IMAGE INFORMATION */}

            {(chart.width || chart.height) && (
              <Text
                fontSize="xs"
                color="var(--public-muted)"
                textAlign="center"
              >
                Image resolution:{" "}
                {chart.width || "—"} ×{" "}
                {chart.height || "—"}
              </Text>
            )}
          </VStack>
        )}
      </Container>
    </>
  );
}
