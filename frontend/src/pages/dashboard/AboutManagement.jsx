
import { useCallback, useEffect, useState } from "react";

import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import RichTextEditor from "../../components/dashboard/about/RichTextEditor.jsx";
import {aboutService}  from "../../services/about.service.js";

// ==================================================
// DEFAULT CONTENT
// ==================================================

const emptyContent = () => ({
  hero: {
    title: "About Us",
    description: "",
  },
  introduction: {
    eyebrow: "Who we are",
    title: "About ACC",
    description: "",
  },
  vision: {
    title: "Our Vision",
    description: "",
  },
  mission: {
    title: "Our Mission",
    description: "",
  },
});

const sections = [
  {
    key: "introduction",
    label: "Who We Are",
  },
  {
    key: "vision",
    label: "Our Vision",
  },
  {
    key: "mission",
    label: "Our Mission",
  },
];

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong.";

// ==================================================
// ABOUT MANAGEMENT
// ==================================================

export default function AboutManagement() {
  const [form, setForm] = useState(emptyContent);

  const [exists, setExists] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const [activeSection, setActiveSection] =
    useState("introduction");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==================================================
  // LOAD ABOUT CONTENT
  // ==================================================

  const loadAbout = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await aboutService.getAdmin();

      if (data) {
        const defaults = emptyContent();

        setForm({
          hero: {
            ...defaults.hero,
            ...data.hero,
          },
          introduction: {
            ...defaults.introduction,
            ...data.introduction,
          },
          vision: {
            ...defaults.vision,
            ...data.vision,
          },
          mission: {
            ...defaults.mission,
            ...data.mission,
          },
        });

        setExists(true);
        setIsPublished(Boolean(data.isPublished));
      } else {
        setForm(emptyContent());
        setExists(false);
        setIsPublished(false);
      }

      setDirty(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAbout();
  }, [loadAbout]);

  // ==================================================
  // UPDATE FIELD
  // ==================================================

  const updateField = (section, field, value) => {
    setForm((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        [field]: value,
      },
    }));

    setDirty(true);
    setSuccess("");
  };

  // ==================================================
  // VALIDATION
  // ==================================================

  const validateForm = () => {
    const requiredFields = [
      form.hero.title,
      form.hero.description,
      form.introduction.eyebrow,
      form.introduction.title,
      form.introduction.description,
      form.vision.title,
      form.vision.description,
      form.mission.title,
      form.mission.description,
    ];

    return requiredFields.every((value) => {
      const text = String(value || "")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .trim();

      return text.length > 0;
    });
  };

  // ==================================================
  // SAVE CONTENT
  // ==================================================

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!validateForm()) {
      setError("Please complete all required fields.");
      return;
    }

    setBusy(true);

    try {
      const data = await aboutService.save(form);

      setExists(true);
      setIsPublished(Boolean(data.isPublished));
      setDirty(false);

      setSuccess(
        data.isPublished
          ? "Content saved. Public About Us is updated."
          : "About Us content saved successfully."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // ==================================================
  // PUBLISH / UNPUBLISH
  // ==================================================

  const handlePublish = async () => {
    if (dirty) {
      setError("Save your changes before publishing.");
      return;
    }

    if (!exists) {
      setError("Save About Us content first.");
      return;
    }

    if (
      !window.confirm(
        "Publish About Us content to the public website?"
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const data = await aboutService.publish();

      setIsPublished(Boolean(data.isPublished));
      setSuccess("About Us published successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleUnpublish = async () => {
    if (
      !window.confirm(
        "Unpublish About Us from the public website?"
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const data = await aboutService.unpublish();

      setIsPublished(Boolean(data.isPublished));
      setSuccess("About Us unpublished successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <Flex align="center" justify="center" minH="300px">
        <Spinner size="lg" />
      </Flex>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <Box maxW="1100px" mx="auto" py="6">
      <VStack align="stretch" gap="6">

        {/* HEADER */}

        <Flex
          justify="space-between"
          align="center"
          flexWrap="wrap"
          gap="4"
        >
          <Box>
            <Heading size="xl">
              About Us Management
            </Heading>

            <Text color="fg.muted" mt="2">
              Manage public website content.
            </Text>
          </Box>

          <Badge
            colorPalette={
              isPublished ? "green" : "gray"
            }
            size="lg"
          >
            {isPublished ? "Published" : "Unpublished"}
          </Badge>
        </Flex>

        {/* ALERTS */}

        {error && (
          <Box
            bg="red.50"
            color="red.700"
            p="4"
            borderRadius="md"
            role="alert"
          >
            {error}
          </Box>
        )}

        {success && (
          <Box
            bg="green.50"
            color="green.700"
            p="4"
            borderRadius="md"
            role="status"
          >
            {success}
          </Box>
        )}

        {isPublished && dirty && (
          <Box
            bg="orange.50"
            color="orange.800"
            p="4"
            borderRadius="md"
          >
            This page is currently published.
            Saving changes will update the live content.
          </Box>
        )}

        {/* HERO SECTION */}

        <Box borderWidth="1px" borderRadius="xl" p="6">
          <VStack align="stretch" gap="4">
            <Heading size="md">Hero Section</Heading>

            <Field.Root required>
              <Field.Label>Page Title</Field.Label>

              <Input
                value={form.hero.title}
                onChange={(event) =>
                  updateField(
                    "hero",
                    "title",
                    event.target.value
                  )
                }
                maxLength={150}
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label>
                Hero Description
              </Field.Label>

              <Input
                value={form.hero.description}
                onChange={(event) =>
                  updateField(
                    "hero",
                    "description",
                    event.target.value
                  )
                }
              />
            </Field.Root>
          </VStack>
        </Box>

        {/* CONTENT EDITOR */}

        <Box borderWidth="1px" borderRadius="xl" p="6">
          <VStack align="stretch" gap="5">

            <Heading size="md">
              About Us Content Editor
            </Heading>

            {/* SECTION TABS */}

            <Flex gap="2" flexWrap="wrap">
              {sections.map((section) => (
                <Button
                  key={section.key}
                  size="sm"
                  variant={
                    activeSection === section.key
                      ? "solid"
                      : "outline"
                  }
                  colorPalette="blue"
                  onClick={() =>
                    setActiveSection(section.key)
                  }
                >
                  {section.label}
                </Button>
              ))}
            </Flex>

            {/* INTRODUCTION EYEBROW */}

            {activeSection === "introduction" && (
              <Field.Root required>
                <Field.Label>
                  Section Eyebrow
                </Field.Label>

                <Input
                  value={form.introduction.eyebrow}
                  onChange={(event) =>
                    updateField(
                      "introduction",
                      "eyebrow",
                      event.target.value
                    )
                  }
                  maxLength={100}
                />
              </Field.Root>
            )}

            {/* SECTION TITLE */}

            <Field.Root required>
              <Field.Label>Section Title</Field.Label>

              <Input
                value={form[activeSection].title}
                onChange={(event) =>
                  updateField(
                    activeSection,
                    "title",
                    event.target.value
                  )
                }
                maxLength={150}
              />
            </Field.Root>

            {/* RICH TEXT EDITOR */}

            <Field.Root required>
              <Field.Label>
                Section Description
              </Field.Label>

              <Box width="100%">
                <RichTextEditor
                  key={activeSection}
                  value={
                    form[activeSection].description
                  }
                  onChange={(html) =>
                    updateField(
                      activeSection,
                      "description",
                      html
                    )
                  }
                  minHeight="240px"
                />
              </Box>
            </Field.Root>
          </VStack>
        </Box>

        {/* ACTION BUTTONS */}

        <Flex
          gap="3"
          justify="flex-end"
          flexWrap="wrap"
        >
          <Button
            variant="outline"
            disabled={busy}
            onClick={loadAbout}
          >
            Reload
          </Button>

          <Button
            colorPalette="blue"
            loading={busy}
            disabled={!dirty || busy}
            onClick={handleSave}
          >
            Save Changes
          </Button>

          {isPublished ? (
            <Button
              colorPalette="orange"
              variant="outline"
              loading={busy}
              disabled={busy || dirty}
              onClick={handleUnpublish}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              colorPalette="green"
              loading={busy}
              disabled={!exists || dirty || busy}
              onClick={handlePublish}
            >
              Publish
            </Button>
          )}
        </Flex>

      </VStack>
    </Box>
  );
}
