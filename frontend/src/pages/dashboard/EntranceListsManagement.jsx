
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";

import { entranceService } from "../../services/entrance.service.js";
import { academicService } from "../../services/academic.service.js";
import EntranceApplicants from "./EntranceApplicants.jsx";

const initialForm = () => ({
  academicYear: "",
  title: "",
  description: "",
});

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Request failed.";

const getItems = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.records)) return result.records;
  return [];
};

const getId = (value) =>
  typeof value === "string" ? value : value?._id ?? "";

const statusColors = {
  draft: "gray",
  published: "green",
  archived: "orange",
};

export default function EntranceListsManagement() {
  const [lists, setLists] = useState([]);
  const [years, setYears] = useState([]);

  const [selectedList, setSelectedList] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm());

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadLists = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await entranceService.getEntranceLists({
        page,
        limit,
      });

      setLists(getItems(result));
      setTotal(result.total ?? 0);
    } catch (err) {
      setError(getError(err));
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadYears = useCallback(async () => {
    try {
      const result = await academicService.list(
        "academic-years",
        { page: 1, limit: 100 }
      );

      setYears(getItems(result));
    } catch (err) {
      setError(getError(err));
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  const changeField = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(initialForm());
    setFormOpen(true);
    setError("");
    setMessage("");
  };

  const openEdit = async (record) => {
    if (record.status !== "draft" || busy) return;

    setBusy(true);
    setError("");

    try {
      const detail =
        await entranceService.getEntranceList(record._id);

      setEditingId(record._id);

      setForm({
        academicYear: getId(detail.academicYear),
        title: detail.title ?? "",
        description: detail.description ?? "",
      });

      setFormOpen(true);
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const saveList = async (event) => {
    event.preventDefault();
    if (busy) return;

    const title = form.title.trim();
    const description = form.description.trim();

    if (!title || title.length > 250) {
      setError("Title is required (maximum 250 characters).");
      return;
    }

    if (description.length > 10000) {
      setError("Description cannot exceed 10000 characters.");
      return;
    }

    if (!editingId && !form.academicYear) {
      setError("Please select an Academic Year.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const payload = { title, description };

      if (editingId) {
        await entranceService.updateEntranceList(
          editingId,
          payload
        );
        setMessage("Entrance List updated.");
      } else {
        await entranceService.createEntranceList({
          academicYear: form.academicYear,
          ...payload,
        });
        setMessage("Entrance List draft created.");
      }

      setFormOpen(false);
      setEditingId(null);

      if (page !== 1) {
        setPage(1);
      } else {
        await loadLists();
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const changePublication = async (record, action) => {
    if (busy) return;

    if (action === "publish" && record.status !== "draft") {
      return;
    }

    if (action === "archive" && record.status !== "published") {
      return;
    }

    const confirmation =
      action === "publish"
        ? "Publish this Entrance List? At least one admitted applicant is required. Published lists cannot be edited."
        : "Archive this Entrance List? It will disappear from the public entrance list page.";

    if (!window.confirm(confirmation)) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (action === "publish") {
        await entranceService.publishEntranceList(record._id);
        setMessage("Entrance List published.");
      } else {
        await entranceService.archiveEntranceList(record._id);
        setMessage("Entrance List archived.");
      }

      await loadLists();
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  if (selectedList) {
    return (
      <Box p={{ base: 4, md: 6 }}>
        <EntranceApplicants
          list={selectedList}
          onBack={() => {
            setSelectedList(null);
            loadLists();
          }}
        />
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }}>
      <VStack align="stretch" gap={6}>
        <Flex
          justify="space-between"
          align="center"
          gap={3}
          wrap="wrap"
        >
          <Box>
            <Heading size="lg">
              Entrance Student Lists
            </Heading>
            <Text color="fg.muted" mt={2}>
              Manage entrance lists and applicants by academic year.
            </Text>
          </Box>

          <HStack>
            {!formOpen && (
              <Button
                colorPalette="blue"
                disabled={busy}
                onClick={openCreate}
              >
                Create Entrance List
              </Button>
            )}

            <Button
              variant="outline"
              disabled={loading || busy}
              onClick={loadLists}
            >
              Refresh
            </Button>
          </HStack>
        </Flex>

        {message && <Text color="green.600">{message}</Text>}
        {error && <Text color="red.500">{error}</Text>}

        {formOpen && (
          <Box
            as="form"
            onSubmit={saveList}
            borderWidth="1px"
            borderRadius="lg"
            p={5}
          >
            <VStack align="stretch" gap={4}>
              <Heading size="md">
                {editingId
                  ? "Edit Entrance List"
                  : "Create Entrance List"}
              </Heading>

              <Field.Root required={!editingId}>
                <Field.Label>Academic Year</Field.Label>

                <NativeSelect.Root
                  disabled={Boolean(editingId)}
                >
                  <NativeSelect.Field
                    value={form.academicYear}
                    onChange={(event) =>
                      changeField(
                        "academicYear",
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Select Academic Year
                    </option>

                    {years.map((year) => (
                      <option key={year._id} value={year._id}>
                        {year.name || year.code}
                      </option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Field.Root>

              <Field.Root required>
                <Field.Label>Title</Field.Label>
                <Input
                  value={form.title}
                  maxLength={250}
                  required
                  onChange={(event) =>
                    changeField("title", event.target.value)
                  }
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Textarea
                  value={form.description}
                  maxLength={10000}
                  rows={4}
                  onChange={(event) =>
                    changeField("description", event.target.value)
                  }
                />
              </Field.Root>

              <HStack justify="flex-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  colorPalette="blue"
                  loading={busy}
                >
                  {editingId
                    ? "Save Changes"
                    : "Create Draft"}
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}

        {loading ? (
          <HStack justify="center" py={10}>
            <Spinner />
            <Text>Loading entrance lists...</Text>
          </HStack>
        ) : lists.length === 0 ? (
          <Box borderWidth="1px" borderRadius="lg" p={8}>
            <Text>No entrance lists found.</Text>
          </Box>
        ) : (
          <Box
            overflowX="auto"
            borderWidth="1px"
            borderRadius="lg"
          >
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Title</Table.ColumnHeader>
                  <Table.ColumnHeader>Academic Year</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Published At</Table.ColumnHeader>
                  <Table.ColumnHeader>Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {lists.map((record) => (
                  <Table.Row key={record._id}>
                    <Table.Cell>{record.title}</Table.Cell>

                    <Table.Cell>
                      {years.find(
                        (year) =>
                          year._id === getId(record.academicYear)
                      )?.name ||
                        record.academicYear?.name ||
                        "—"}
                    </Table.Cell>

                    <Table.Cell>
                      <Badge
                        colorPalette={
                          statusColors[record.status] || "gray"
                        }
                      >
                        {record.status}
                      </Badge>
                    </Table.Cell>

                    <Table.Cell>
                      {record.publishedAt
                        ? new Date(
                            record.publishedAt
                          ).toLocaleString()
                        : "—"}
                    </Table.Cell>

                    <Table.Cell>
                      <HStack gap={2} wrap="wrap">
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setSelectedList(record)}
                        >
                          Manage Applicants
                        </Button>

                        {record.status === "draft" && (
                          <>
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={busy}
                              onClick={() => openEdit(record)}
                            >
                              Edit
                            </Button>

                            <Button
                              size="xs"
                              colorPalette="green"
                              disabled={busy}
                              onClick={() =>
                                changePublication(
                                  record,
                                  "publish"
                                )
                              }
                            >
                              Publish
                            </Button>
                          </>
                        )}

                        {record.status === "published" && (
                          <Button
                            size="xs"
                            colorPalette="orange"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              changePublication(
                                record,
                                "archive"
                              )
                            }
                          >
                            Archive
                          </Button>
                        )}
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}

        <HStack justify="space-between">
          <Text fontSize="sm">
            Page {page} of {totalPages} — {total} records
          </Text>

          <HStack>
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
}
