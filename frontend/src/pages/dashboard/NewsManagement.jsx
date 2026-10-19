
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Heading,
  Image,
  Input,
  NativeSelect,
  Spinner,
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import DOMPurify from "dompurify";

import RichTextEditor from "../../components/dashboard/about/RichTextEditor.jsx";
import { newsService } from "../../services/news.service.js";

const CATEGORIES = [
  "Announcement",
  "Event",
  "Academic",
  "General",
  "Programs",
  "Admission",
  "Collaboration",
  "Student Life",
];

const emptyForm = () => ({
  title: "",
  summary: "",
  content: "",
  coverImage: "",
  category: "General",
  isFeatured: false,
});

const getError = (error) => {
  const data = error?.response?.data;

  if (data?.message) return data.message;

  return error?.message || "Something went wrong.";
};

const plainText = (html) =>
  DOMPurify.sanitize(html || "", {
    ALLOWED_TAGS: [],
  })
    .replace(/&nbsp;/gi, " ")
    .trim();

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString();
};

function Drawer({ title, children, onClose, disabled }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !disabled) {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () =>
      document.removeEventListener("keydown", onKeyDown);
  }, [onClose, disabled]);

  return (
    <Box
      position="fixed"
      inset="0"
      zIndex={1500}
      bg="blackAlpha.600"
      onClick={() => {
        if (!disabled) onClose();
      }}
    >
      <Flex
        role="dialog"
        aria-modal="true"
        aria-label={title}
        position="absolute"
        right="0"
        top="0"
        bottom="0"
        w="100%"
        maxW="680px"
        bg="bg.panel"
        boxShadow="2xl"
        direction="column"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </Flex>
    </Box>
  );
}

export default function NewsManagement() {
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [preview, setPreview] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadNews = useCallback(async () => {
    try {
      const data = await newsService.getAll();
      setArticles(data.news || []);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const openEdit = (article) => {
    setEditingId(article._id);

    setForm({
      title: article.title || "",
      summary: article.summary || "",
      content: article.content || "",
      coverImage: article.coverImage || "",
      category: article.category || "General",
      isFeatured: Boolean(article.isFeatured),
    });

    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (busy) return;

    setFormOpen(false);
    setEditingId(null);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.title.trim().length < 3) {
      setError("Title must contain at least 3 characters.");
      return;
    }

    if (form.summary.trim().length < 5) {
      setError("Summary must contain at least 5 characters.");
      return;
    }

    if (!plainText(form.content)) {
      setError("News content is required.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      content: form.content,
      coverImage: form.coverImage.trim(),
      category: form.category,
      isFeatured: form.isFeatured,
    };

    setBusy(true);

    try {
      if (editingId) {
        await newsService.update(editingId, payload);
      } else {
        await newsService.create(payload);
      }

      setSuccess(
        editingId
          ? "News updated successfully."
          : "News created successfully."
      );

      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm());

      await loadNews();
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePublication = async (article) => {
    const next = !article.isPublished;

    if (
      !window.confirm(
        `${next ? "Publish" : "Unpublish"} "${article.title}"?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await newsService.setPublication(article._id, next);

      setSuccess(
        next
          ? "News published successfully."
          : "News unpublished successfully."
      );

      await loadNews();
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (article) => {
    if (
      !window.confirm(
        `Permanently delete "${article.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await newsService.remove(article._id);

      setSuccess("News deleted successfully.");
      await loadNews();
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleView = async (article) => {
    if (!article.isPublished) return;

    setBusy(true);
    setError("");

    try {
      const data = await newsService.getById(article._id);
      setPreview(data.news);
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const filtered = articles.filter((article) => {
    const query = search.trim().toLowerCase();

    const matchesSearch = [
      article.title,
      article.summary,
      article.category,
    ].some((value) =>
      String(value || "").toLowerCase().includes(query)
    );

    const matchesCategory =
      categoryFilter === "All" ||
      article.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Published"
        ? article.isPublished
        : !article.isPublished);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <Flex minH="300px" align="center" justify="center">
        <Spinner size="lg" />
      </Flex>
    );
  }

  return (
    <Box w="100%" py="6">
      <VStack align="stretch" gap="6">
        <Flex
          align="center"
          justify="space-between"
          gap="4"
          wrap="wrap"
        >
          <Box>
            <Heading size="xl">News Management</Heading>

            <Text mt="1" color="fg.muted">
              Create, publish and manage college news.
            </Text>
          </Box>

          <Button
            colorPalette="blue"
            onClick={openCreate}
            disabled={busy}
          >
            + Add News
          </Button>
        </Flex>

        {error && !formOpen && (
          <Box
            p="3"
            borderWidth="1px"
            borderColor="red.300"
            borderRadius="lg"
            color="red.600"
            role="alert"
          >
            {error}
          </Box>
        )}

        {success && (
          <Box
            p="3"
            borderWidth="1px"
            borderColor="green.300"
            borderRadius="lg"
            color="green.600"
            role="status"
          >
            {success}
          </Box>
        )}

        <Box borderWidth="1px" borderRadius="xl" overflow="hidden">
          <Flex
            p="5"
            justify="space-between"
            align="center"
            gap="3"
            wrap="wrap"
          >
            <Box>
              <Heading size="md">All News</Heading>
              <Text fontSize="sm" color="fg.muted">
                {articles.length} total articles
              </Text>
            </Box>

            <Flex gap="2" wrap="wrap">
              <Input
                placeholder="Search news..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                maxW="220px"
              />

              <NativeSelect.Root maxW="160px">
                <NativeSelect.Field
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(event.target.value)
                  }
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>

              <NativeSelect.Root maxW="140px">
                <NativeSelect.Field
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="All">All Status</option>
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                </NativeSelect.Field>
              </NativeSelect.Root>

              <Button
                variant="outline"
                disabled={busy}
                onClick={loadNews}
              >
                Refresh
              </Button>
            </Flex>
          </Flex>

          <Box overflowX="auto">
            <Table.Root size="sm" variant="line">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>News</Table.ColumnHeader>
                  <Table.ColumnHeader>Category</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Published</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">
                    Actions
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {filtered.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5}>
                      <Text
                        textAlign="center"
                        py="8"
                        color="fg.muted"
                      >
                        No news articles found.
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filtered.map((article) => (
                    <Table.Row key={article._id}>
                      <Table.Cell>
                        <Flex
                          align="center"
                          gap="3"
                          minW="240px"
                        >
                          {article.coverImage ? (
                            <Image
                              src={article.coverImage}
                              alt={article.title}
                              boxSize="56px"
                              objectFit="cover"
                              borderRadius="md"
                            />
                          ) : (
                            <Flex
                              boxSize="56px"
                              bg="bg.muted"
                              align="center"
                              justify="center"
                              borderRadius="md"
                              fontSize="xs"
                              color="fg.muted"
                            >
                              News
                            </Flex>
                          )}

                          <Box>
                            <Text fontWeight="semibold">
                              {article.title}
                            </Text>

                            {article.isFeatured && (
                              <Badge
                                mt="1"
                                colorPalette="purple"
                              >
                                Featured
                              </Badge>
                            )}
                          </Box>
                        </Flex>
                      </Table.Cell>

                      <Table.Cell>
                        {article.category}
                      </Table.Cell>

                      <Table.Cell>
                        <Badge
                          colorPalette={
                            article.isPublished
                              ? "green"
                              : "gray"
                          }
                        >
                          {article.isPublished
                            ? "Published"
                            : "Draft"}
                        </Badge>
                      </Table.Cell>

                      <Table.Cell>
                        {formatDate(article.publishedAt)}
                      </Table.Cell>

                      <Table.Cell textAlign="end">
                        <Flex
                          justify="flex-end"
                          gap="2"
                          wrap="wrap"
                        >
                          {article.isPublished && (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleView(article)}
                            >
                              View
                            </Button>
                          )}

                          <Button
                            size="xs"
                            variant="outline"
                            disabled={busy}
                            onClick={() => openEdit(article)}
                          >
                            Edit
                          </Button>

                          <Button
                            size="xs"
                            variant="outline"
                            colorPalette="blue"
                            disabled={busy}
                            onClick={() =>
                              handlePublication(article)
                            }
                          >
                            {article.isPublished
                              ? "Unpublish"
                              : "Publish"}
                          </Button>

                          <Button
                            size="xs"
                            variant="outline"
                            colorPalette="red"
                            disabled={busy}
                            onClick={() => handleDelete(article)}
                          >
                            Delete
                          </Button>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>
      </VStack>

      {/* CREATE / EDIT DRAWER */}

      {formOpen && (
        <Drawer
          title={editingId ? "Edit News" : "Create News"}
          onClose={closeForm}
          disabled={busy}
        >
          <Flex
            p="5"
            align="center"
            justify="space-between"
            borderBottomWidth="1px"
          >
            <Heading size="lg">
              {editingId ? "Edit News" : "Create News"}
            </Heading>

            <Button
              variant="ghost"
              disabled={busy}
              onClick={closeForm}
            >
              Close
            </Button>
          </Flex>

          <Box flex="1" overflowY="auto" p="5">
            <form id="news-form" onSubmit={handleSave}>
              <VStack align="stretch" gap="5">
                {error && (
                  <Box
                    p="3"
                    borderWidth="1px"
                    borderColor="red.300"
                    color="red.600"
                    borderRadius="lg"
                    role="alert"
                  >
                    {error}
                  </Box>
                )}

                <Field.Root required>
                  <Field.Label>News Title</Field.Label>
                  <Input
                    value={form.title}
                    maxLength={200}
                    disabled={busy}
                    placeholder="Enter news title"
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>Summary</Field.Label>
                  <Textarea
                    rows={3}
                    value={form.summary}
                    maxLength={1000}
                    disabled={busy}
                    placeholder="Short news summary"
                    onChange={(event) =>
                      updateField("summary", event.target.value)
                    }
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Cover Image URL / Path</Field.Label>
                  <Input
                    value={form.coverImage}
                    disabled={busy}
                    placeholder="/img/news1.jpg"
                    onChange={(event) =>
                      updateField(
                        "coverImage",
                        event.target.value
                      )
                    }
                  />
                </Field.Root>

                {form.coverImage && (
                  <Image
                    src={form.coverImage}
                    alt="Cover preview"
                    maxH="180px"
                    objectFit="contain"
                    borderRadius="lg"
                  />
                )}

                <Field.Root>
                  <Field.Label>Category</Field.Label>

                  <NativeSelect.Root width="100%">
                    <NativeSelect.Field
                      value={form.category}
                      disabled={busy}
                      onChange={(event) =>
                        updateField(
                          "category",
                          event.target.value
                        )
                      }
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root required>
                  <Field.Label>News Content</Field.Label>

                  <Box width="100%" minW="0">
                    <RichTextEditor
                      value={form.content}
                      onChange={(value) =>
                        updateField("content", value)
                      }
                      minHeight="240px"
                      disabled={busy}
                    />
                  </Box>
                </Field.Root>

                <Checkbox.Root
                  checked={form.isFeatured}
                  disabled={busy}
                  onCheckedChange={(details) =>
                    updateField(
                      "isFeatured",
                      details.checked === true
                    )
                  }
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    Mark as Featured News
                  </Checkbox.Label>
                </Checkbox.Root>

                <Text fontSize="sm" color="fg.muted">
                  New articles are saved as drafts. Publish
                  them from the table when ready.
                </Text>
              </VStack>
            </form>
          </Box>

          <Flex
            p="5"
            gap="3"
            justify="flex-end"
            borderTopWidth="1px"
          >
            <Button
              variant="outline"
              disabled={busy}
              onClick={closeForm}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="news-form"
              colorPalette="blue"
              loading={busy}
              disabled={busy}
            >
              {editingId ? "Save Changes" : "Create News"}
            </Button>
          </Flex>
        </Drawer>
      )}

      {/* PUBLISHED NEWS PREVIEW */}

      {preview && (
        <Drawer
          title="News Preview"
          onClose={() => setPreview(null)}
        >
          <Flex
            p="5"
            align="center"
            justify="space-between"
            borderBottomWidth="1px"
          >
            <Heading size="lg">News Preview</Heading>

            <Button
              variant="outline"
              onClick={() => setPreview(null)}
            >
              Close
            </Button>
          </Flex>

          <Box flex="1" overflowY="auto" p="6">
            <VStack align="stretch" gap="5">
              {preview.coverImage && (
                <Image
                  src={preview.coverImage}
                  alt={preview.title}
                  width="100%"
                  maxH="300px"
                  objectFit="cover"
                  borderRadius="xl"
                />
              )}

              <Flex gap="2" wrap="wrap">
                <Badge colorPalette="blue">
                  {preview.category}
                </Badge>

                {preview.isFeatured && (
                  <Badge colorPalette="purple">
                    Featured
                  </Badge>
                )}

                <Badge colorPalette="green">
                  Published
                </Badge>
              </Flex>

              <Heading size="xl">{preview.title}</Heading>

              <Text fontSize="sm" color="fg.muted">
                Published: {formatDate(preview.publishedAt)}
              </Text>

              <Text
                fontWeight="medium"
                whiteSpace="pre-wrap"
              >
                {preview.summary}
              </Text>

              <Box
                lineHeight="1.9"
                css={{
                  "& p": { marginBottom: "1rem" },
                  "& h1, & h2, & h3": {
                    fontWeight: "bold",
                    marginTop: "1.5rem",
                    marginBottom: "0.75rem",
                  },
                  "& ul": {
                    paddingLeft: "1.5rem",
                    listStyleType: "disc",
                  },
                  "& ol": {
                    paddingLeft: "1.5rem",
                    listStyleType: "decimal",
                  },
                  "& a": {
                    color: "#2563eb",
                    textDecoration: "underline",
                  },
                }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    preview.content || ""
                  ),
                }}
              />
            </VStack>
          </Box>
        </Drawer>
      )}
    </Box>
  );
}
