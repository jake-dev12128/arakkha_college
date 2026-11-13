
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useOutletContext } from "react-router-dom";

import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Image,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";

import organizationChartService from "../../services/organizationChart.service.js";

// ==================================================
// CONSTANTS
// ==================================================

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const DEFAULT_TITLE = "Organization Chart";

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
};

const getMediaId = (image) =>
  image?.mediaId
    ? String(image.mediaId)
    : null;

// ==================================================
// ORGANIZATION CHART MANAGEMENT
// ==================================================

export default function OrganizationChartManagement() {
  const { user } = useOutletContext() ?? {};

  const canManage = [
    "super_admin",
    "admin",
  ].includes(user?.role);

  const isReadOnly = user?.role === "teacher";

  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [chart, setChart] = useState(null);

  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [description, setDescription] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [localPreview, setLocalPreview] = useState("");

  const [pendingMedia, setPendingMedia] = useState(null);
  const [removeDraftRequested, setRemoveDraftRequested] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==================================================
  // DERIVED STATE
  // ==================================================

  const exists = Boolean(chart?._id);

  const isPublished = Boolean(chart?.isPublished);

  const draftImage = chart?.draftImage ?? null;
  const publishedImage = chart?.publishedImage ?? null;

  const draftMediaId = getMediaId(draftImage);
  const publishedMediaId = getMediaId(publishedImage);

  const savedTitle = chart?.title ?? DEFAULT_TITLE;
  const savedDescription = chart?.description ?? "";

  const metadataDirty =
    title.trim() !== savedTitle ||
    description.trim() !== savedDescription;

  const imageDirty =
    Boolean(pendingMedia) ||
    removeDraftRequested;

  const dirty = metadataDirty || imageDirty;

  const hasSavedDraft = Boolean(draftMediaId);

  const hasUnsavedFile = Boolean(selectedFile);

  const canPublish =
    canManage &&
    exists &&
    hasSavedDraft &&
    !dirty &&
    !hasUnsavedFile &&
    !busy;

  // ==================================================
  // PREVIEW URL CLEANUP
  // ==================================================

  const clearLocalPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setLocalPreview("");
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // ==================================================
  // LOAD CHART
  // ==================================================

  const loadChart = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const data =
        await organizationChartService.getAdmin();

      setChart(data ?? null);

      setTitle(data?.title ?? DEFAULT_TITLE);
      setDescription(data?.description ?? "");

      setPendingMedia(null);
      setRemoveDraftRequested(false);

      clearLocalPreview();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [clearLocalPreview]);

  useEffect(() => {
    void loadChart();
  }, [loadChart]);

  // ==================================================
  // SELECT IMAGE
  // ==================================================

  const handleFileChange = (event) => {
    if (!canManage || busy) return;

    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setSuccess("");

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      event.target.value = "";

      setError(
        "Only JPG, PNG and WebP images are allowed."
      );

      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      event.target.value = "";

      setError(
        "Image size must not exceed 5 MB."
      );

      return;
    }

    clearLocalPreview();

    const url = URL.createObjectURL(file);

    previewUrlRef.current = url;

    setSelectedFile(file);
    setLocalPreview(url);

    setRemoveDraftRequested(false);
  };

  // ==================================================
  // UPLOAD SELECTED IMAGE
  // ==================================================

  const handleUpload = async () => {
    if (!canManage || busy || !selectedFile) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const uploaded =
        await organizationChartService.uploadImage(
          selectedFile
        );

      if (!uploaded?.mediaId || !uploaded?.url) {
        throw new Error(
          "Upload succeeded but media information is missing."
        );
      }

      setPendingMedia({
        mediaId: String(uploaded.mediaId),
        url: uploaded.url,
        width: uploaded.width,
        height: uploaded.height,
      });

      setRemoveDraftRequested(false);

      clearLocalPreview();

      setSuccess(
        "Image uploaded successfully. Click Save Draft to attach it."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // ==================================================
  // REMOVE DRAFT IMAGE
  // ==================================================

  const handleRemoveDraft = () => {
    if (!canManage || busy) return;

    setError("");
    setSuccess("");

    if (selectedFile) {
      clearLocalPreview();
    }

    if (pendingMedia) {
      setPendingMedia(null);
    }

    setRemoveDraftRequested(true);

    setSuccess(
      "Draft image removal is pending. Click Save Draft to confirm."
    );
  };

  // ==================================================
  // SAVE DRAFT
  // ==================================================

  const handleSaveDraft = async () => {
    if (!canManage || busy) return;

    if (selectedFile) {
      setError(
        "Please upload the selected image before saving."
      );

      return;
    }

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle) {
      setError("Title is required.");
      return;
    }

    if (cleanTitle.length > 250) {
      setError("Title must not exceed 250 characters.");
      return;
    }

    if (cleanDescription.length > 2000) {
      setError(
        "Description must not exceed 2000 characters."
      );
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: cleanTitle,
        description: cleanDescription,
      };

      if (pendingMedia?.mediaId) {
        payload.mediaId = pendingMedia.mediaId;
      } else if (removeDraftRequested) {
        payload.mediaId = null;
      }

      const saved = exists
        ? await organizationChartService.update(payload)
        : await organizationChartService.create(payload);

      setChart(saved);
      setTitle(saved?.title ?? cleanTitle);
      setDescription(
        saved?.description ?? cleanDescription
      );

      setPendingMedia(null);
      setRemoveDraftRequested(false);

      setSuccess("Draft saved successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // ==================================================
  // PUBLISH
  // ==================================================

  const handlePublish = async () => {
    if (!canPublish) return;

    const confirmed = window.confirm(
      "Publish this Organization Chart to the public website?"
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const published =
        await organizationChartService.publish();

      setChart(published);

      setSuccess(
        "Organization Chart published successfully."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // ==================================================
  // UNPUBLISH
  // ==================================================

  const handleUnpublish = async () => {
    if (!canManage || busy || !isPublished) return;

    const confirmed = window.confirm(
      "Unpublish the Organization Chart? It will no longer be visible on the public website."
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await organizationChartService.unpublish();

      setChart(updated);

      setSuccess(
        "Organization Chart unpublished successfully."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // ==================================================
  // CANCEL LOCAL CHANGES
  // ==================================================

  const handleReset = () => {
    if (busy) return;

    setTitle(chart?.title ?? DEFAULT_TITLE);
    setDescription(chart?.description ?? "");

    setPendingMedia(null);
    setRemoveDraftRequested(false);

    clearLocalPreview();

    setError("");
    setSuccess("");
  };

  // ==================================================
  // PREVIEW SOURCE
  // ==================================================

  const previewSource = removeDraftRequested
    ? ""
    : localPreview ||
      pendingMedia?.url ||
      draftImage?.url ||
      "";

  const previewLabel = localPreview
    ? "Selected image — not uploaded"
    : pendingMedia
      ? "Uploaded image — draft not saved"
      : removeDraftRequested
        ? "Draft image removal pending"
        : "Saved draft image";

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <Flex
        minH="320px"
        align="center"
        justify="center"
        direction="column"
        gap="3"
      >
        <Spinner size="lg" colorPalette="blue" />
        <Text color="fg.muted">
          Loading Organization Chart...
        </Text>
      </Flex>
    );
  }

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <Box width="100%">
      <VStack align="stretch" gap="6">
        {/* HEADER */}

        <Flex
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          gap="4"
          direction={{ base: "column", md: "row" }}
        >
          <Box>
            <Heading size="xl">
              Organization Chart
            </Heading>

            <Text
              color="fg.muted"
              fontSize="sm"
              mt="2"
            >
              Manage the official organizational
              structure of ACC Computer College.
            </Text>
          </Box>

          <Flex gap="2" align="center" flexWrap="wrap">
            <Badge
              colorPalette={
                isPublished ? "green" : "orange"
              }
              variant="subtle"
              px="3"
              py="1"
            >
              {isPublished ? "Published" : "Draft"}
            </Badge>

            {isReadOnly && (
              <Badge colorPalette="blue">
                Read-only
              </Badge>
            )}
          </Flex>
        </Flex>

        {/* FEEDBACK */}

        {error && (
          <Box
            borderWidth="1px"
            borderColor="red.300"
            borderRadius="lg"
            p="4"
            role="alert"
          >
            <Text
              color="red.500"
              fontSize="sm"
            >
              {error}
            </Text>
          </Box>
        )}

        {success && (
          <Box
            borderWidth="1px"
            borderColor="green.300"
            borderRadius="lg"
            p="4"
            role="status"
          >
            <Text
              color="green.500"
              fontSize="sm"
            >
              {success}
            </Text>
          </Box>
        )}

        {/* INFORMATION */}

        <Box
          borderWidth="1px"
          borderColor="border"
          bg="bg.panel"
          borderRadius="xl"
          p={{ base: "4", md: "6" }}
        >
          <VStack align="stretch" gap="5">
            <Heading size="md">
              Chart Information
            </Heading>

            <Field.Root required>
              <Field.Label>
                Title
              </Field.Label>

              <Input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                maxLength={250}
                readOnly={!canManage || busy}
                placeholder="Organization Chart"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>
                Description
              </Field.Label>

              <Textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                maxLength={2000}
                rows={4}
                readOnly={!canManage || busy}
                placeholder="Describe the organizational structure..."
              />

              <Field.HelperText>
                {description.length}/2000 characters
              </Field.HelperText>
            </Field.Root>
          </VStack>
        </Box>

        {/* DRAFT IMAGE */}

        <Box
          borderWidth="1px"
          borderColor="border"
          bg="bg.panel"
          borderRadius="xl"
          p={{ base: "4", md: "6" }}
        >
          <VStack align="stretch" gap="4">
            <Flex
              justify="space-between"
              align="center"
              gap="3"
              flexWrap="wrap"
            >
              <Heading size="md">
                Draft Image
              </Heading>

              <Badge
                colorPalette={
                  pendingMedia || selectedFile
                    ? "orange"
                    : hasSavedDraft
                      ? "green"
                      : "gray"
                }
              >
                {pendingMedia
                  ? "Not saved"
                  : selectedFile
                    ? "Not uploaded"
                    : hasSavedDraft
                      ? "Saved"
                      : "No image"}
              </Badge>
            </Flex>

            <Box
              borderWidth="1px"
              borderColor="border"
              borderRadius="lg"
              overflow="hidden"
              bg="bg.subtle"
              p="3"
            >
              {previewSource ? (
                <Image
                  src={previewSource}
                  alt="Organization Chart draft preview"
                  display="block"
                  width="100%"
                  maxH="600px"
                  objectFit="contain"
                />
              ) : (
                <Flex
                  minH="240px"
                  align="center"
                  justify="center"
                  direction="column"
                  gap="2"
                >
                  <Text color="fg.muted">
                    No draft image selected.
                  </Text>

                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    Upload a JPG, PNG or WebP image.
                  </Text>
                </Flex>
              )}
            </Box>

            <Text
              color="fg.muted"
              fontSize="xs"
            >
              {previewLabel}
            </Text>

            {canManage && (
              <VStack align="stretch" gap="3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={busy}
                  p="1"
                />

                <Text
                  fontSize="xs"
                  color="fg.muted"
                >
                  Supported formats: JPG, PNG, WebP.
                  Maximum file size: 5 MB.
                </Text>

                <Flex
                  gap="3"
                  flexWrap="wrap"
                >
                  <Button
                    colorPalette="blue"
                    variant="outline"
                    disabled={!selectedFile || busy}
                    loading={busy}
                    onClick={handleUpload}
                  >
                    Upload Image
                  </Button>

                  <Button
                    colorPalette="red"
                    variant="outline"
                    disabled={
                      busy ||
                      (!draftImage &&
                        !pendingMedia &&
                        !selectedFile)
                    }
                    onClick={handleRemoveDraft}
                  >
                    Remove Draft Image
                  </Button>
                </Flex>
              </VStack>
            )}
          </VStack>
        </Box>

        {/* PUBLISHED IMAGE */}

        <Box
          borderWidth="1px"
          borderColor="border"
          bg="bg.panel"
          borderRadius="xl"
          p={{ base: "4", md: "6" }}
        >
          <VStack align="stretch" gap="4">
            <Flex
              justify="space-between"
              align="center"
            >
              <Heading size="md">
                Published Image
              </Heading>

              <Badge
                colorPalette={
                  isPublished ? "green" : "gray"
                }
              >
                {isPublished
                  ? "Publicly visible"
                  : "Not public"}
              </Badge>
            </Flex>

            {publishedImage?.url ? (
              <Image
                src={publishedImage.url}
                alt="Published Organization Chart"
                width="100%"
                maxH="600px"
                objectFit="contain"
                borderRadius="lg"
              />
            ) : (
              <Flex
                minH="160px"
                align="center"
                justify="center"
                bg="bg.subtle"
                borderRadius="lg"
              >
                <Text color="fg.muted">
                  No published image yet.
                </Text>
              </Flex>
            )}

            <Text
              color="fg.muted"
              fontSize="xs"
            >
              Last published:{" "}
              {formatDate(chart?.publishedAt)}
            </Text>

            {isPublished &&
              draftMediaId !== publishedMediaId && (
                <Text
                  color="orange.500"
                  fontSize="sm"
                >
                  A different draft image is saved.
                  Publish again to update the public image.
                </Text>
              )}
          </VStack>
        </Box>

        {/* ACTIONS */}

        <Flex
          justify="flex-end"
          align="center"
          flexWrap="wrap"
          gap="3"
        >
          <Button
            variant="outline"
            colorPalette="gray"
            disabled={busy}
            onClick={loadChart}
          >
            Reload
          </Button>

          {canManage && (
            <>
              <Button
                variant="outline"
                disabled={!dirty || busy}
                onClick={handleReset}
              >
                Discard Changes
              </Button>

              <Button
                colorPalette="blue"
                disabled={
                  busy ||
                  hasUnsavedFile ||
                  (exists && !dirty)
                }
                loading={busy}
                onClick={handleSaveDraft}
              >
                Save Draft
              </Button>

              {isPublished ? (
                <Button
                  colorPalette="orange"
                  variant="outline"
                  disabled={busy}
                  loading={busy}
                  onClick={handleUnpublish}
                >
                  Unpublish
                </Button>
              ) : (
                <Button
                  colorPalette="green"
                  disabled={!canPublish}
                  loading={busy}
                  onClick={handlePublish}
                >
                  Publish
                </Button>
              )}

              {isPublished &&
                draftMediaId &&
                draftMediaId !== publishedMediaId && (
                  <Button
                    colorPalette="green"
                    disabled={!canPublish}
                    loading={busy}
                    onClick={handlePublish}
                  >
                    Publish New Version
                  </Button>
                )}
            </>
          )}
        </Flex>

        {/* STATUS INFORMATION */}

        <Box
          borderWidth="1px"
          borderColor="border"
          borderRadius="lg"
          p="4"
          bg="bg.subtle"
        >
          <VStack
            align="stretch"
            gap="2"
          >
            <Text
              fontWeight="semibold"
              fontSize="sm"
            >
              Organization Chart Status
            </Text>

            <Text
              fontSize="sm"
              color="fg.muted"
            >
              Record:{" "}
              {exists ? "Created" : "Not created"}
            </Text>

            <Text
              fontSize="sm"
              color="fg.muted"
            >
              Draft Image:{" "}
              {hasSavedDraft ? "Saved" : "Missing"}
            </Text>

            <Text
              fontSize="sm"
              color="fg.muted"
            >
              Publication:{" "}
              {isPublished
                ? "Published"
                : "Unpublished"}
            </Text>

            {isReadOnly && (
              <Text
                fontSize="sm"
                color="fg.muted"
              >
                Your account has read-only access
                to Organization Chart Management.
              </Text>
            )}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
