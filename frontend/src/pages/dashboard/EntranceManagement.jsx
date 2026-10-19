
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
import EntranceListsManagement from "./EntranceListsManagement.jsx";
import { entranceService } from "../../services/entrance.service.js";
import { academicService } from "../../services/academic.service.js";

// ==================================================
// CONSTANTS
// ==================================================

const emptyForm = () => ({
  academicYear: "",
  title: "",
  description: "",
  requirements: [{ title: "", description: "" }],
  awards: [{ awardTitle: "", description: "" }],
  pdfUrl: "",
  fileName: "",
  applicationStartDate: "",
  applicationEndDate: "",
});

const statusColors = {
  draft: "gray",
  published: "green",
  archived: "orange",
};

const errorMessage = (error) => {
  const response = error?.response?.data;

  return (
    response?.message ||
    response?.error?.message ||
    error?.message ||
    "Request failed."
  );
};

const getItems = (result) => {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.items)) {
    return result.items;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.records)) {
    return result.records;
  }

  return [];
};

const getId = (value) => {
  if (typeof value === "string") return value;
  return value?._id || "";
};

const toDateField = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
};

const toIso = (value) =>
  value
    ? new Date(`${value}T00:00:00.000Z`).toISOString()
    : null;

const formatDate = (value) =>
  value ? new Date(value).toLocaleString() : "—";

// ==================================================
// COMPONENT
// ==================================================

export default function EntranceManagement({
  resource = "information",
}) {
  const isInformation = resource === "information";

  const [records, setRecords] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  // ==================================================
  // LOAD DATA
  // ==================================================

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = isInformation
        ? await entranceService.getInformationList({
            page: 1,
            limit: 100,
          })
        : await entranceService.getEntranceLists({
            page: 1,
            limit: 100,
          });

      setRecords(getItems(response));
    } catch (err) {
      setError(errorMessage(err));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [isInformation]);

const loadAcademicYears = useCallback(async () => {
  try {
    const response = await academicService.list(
      "academic-years",
      {
        page: 1,
        limit: 100,
      }
    );

    const years = getItems(response);

    console.log("Academic Years:", years);

    setAcademicYears(years);
  } catch (err) {
    console.error("Academic Year Load Error:", err);
    setError(errorMessage(err));
  }
}, []);

  useEffect(() => {
    loadRecords();

    if (isInformation) {
      loadAcademicYears();
    }
  }, [loadRecords, loadAcademicYears, isInformation]);

  // ==================================================
  // FORM HELPERS
  // ==================================================

  const changeField = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const changeArrayItem = (field, index, key, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: previous[field].map((item, position) =>
        position === index
          ? { ...item, [key]: value }
          : item
      ),
    }));
  };

  const addArrayItem = (field) => {
    setForm((previous) => ({
      ...previous,
      [field]: [
        ...previous[field],
        field === "requirements"
          ? { title: "", description: "" }
          : { awardTitle: "", description: "" },
      ],
    }));
  };

  const removeArrayItem = (field, index) => {
    setForm((previous) => ({
      ...previous,
      [field]: previous[field].filter(
        (_, position) => position !== index
      ),
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setMessage("");
    setFormOpen(true);
  };

  const openEdit = async (record) => {
    if (record.status !== "draft") return;

    setBusy(true);
    setError("");

    try {
      const detail =
        await entranceService.getInformation(record._id);

      setEditingId(record._id);

      setForm({
        academicYear: getId(detail.academicYear),
        title: detail.title || "",
        description: detail.description || "",

        requirements: detail.requirements?.length
          ? detail.requirements.map((item) => ({
              title: item.title || "",
              description: item.description || "",
            }))
          : [{ title: "", description: "" }],

        awards: detail.awards?.length
          ? detail.awards.map((item) => ({
              awardTitle: item.awardTitle || "",
              description: item.description || "",
              ...(getId(item.program)
                ? { program: getId(item.program) }
                : {}),
            }))
          : [{ awardTitle: "", description: "" }],

        pdfUrl: detail.application?.pdfUrl || "",
        fileName: detail.application?.fileName || "",

        applicationStartDate: toDateField(
          detail.applicationStartDate
        ),

        applicationEndDate: toDateField(
          detail.applicationEndDate
        ),
      });

      setFormOpen(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // ==================================================
  // VALIDATION
  // ==================================================

  const buildPayload = () => {
    if (!editingId && !form.academicYear) {
      throw new Error("Please select an Academic Year.");
    }

    if (!form.title.trim()) {
      throw new Error("Title is required.");
    }

    if (form.title.trim().length > 250) {
      throw new Error("Title cannot exceed 250 characters.");
    }

    if (form.description.length > 10000) {
      throw new Error(
        "Description cannot exceed 10000 characters."
      );
    }

    const requirements = form.requirements
      .filter(
        (item) =>
          item.title.trim() || item.description.trim()
      )
      .map((item, index) => ({
        title: item.title.trim(),
        description: item.description.trim(),
        order: index + 1,
      }));

    const awards = form.awards
      .filter(
        (item) =>
          item.awardTitle.trim() ||
          item.description.trim()
      )
      .map((item, index) => ({
        ...(item.program
          ? { program: item.program }
          : {}),
        awardTitle: item.awardTitle.trim(),
        description: item.description.trim(),
        order: index + 1,
      }));

    if (requirements.length > 100 || awards.length > 100) {
      throw new Error("Maximum 100 entries per section.");
    }

    if (
      requirements.some(
        (item) =>
          !item.title ||
          !item.description ||
          item.title.length > 200 ||
          item.description.length > 3000
      )
    ) {
      throw new Error(
        "Each requirement needs a title (max 200) and description (max 3000)."
      );
    }

    if (
      awards.some(
        (item) =>
          !item.awardTitle ||
          item.awardTitle.length > 200 ||
          item.description.length > 2000
      )
    ) {
      throw new Error(
        "Each award needs a title (max 200); description max 2000."
      );
    }

    const pdfUrl = form.pdfUrl.trim();
    const fileName = form.fileName.trim();

    if (Boolean(pdfUrl) !== Boolean(fileName)) {
      throw new Error(
        "PDF URL and File Name must both be provided."
      );
    }

    if (pdfUrl) {
      let url;

      try {
        url = new URL(pdfUrl);
      } catch {
        throw new Error("Invalid PDF URL.");
      }

      if (url.protocol !== "https:") {
        throw new Error("PDF URL must use HTTPS.");
      }

      if (pdfUrl.length > 2048 || fileName.length > 255) {
        throw new Error("PDF URL or File Name is too long.");
      }
    }

    if (
      form.applicationStartDate &&
      form.applicationEndDate &&
      form.applicationEndDate <= form.applicationStartDate
    ) {
      throw new Error(
        "Application end date must follow start date."
      );
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      requirements,
      awards,
      applicationStartDate: toIso(
        form.applicationStartDate
      ),
      applicationEndDate: toIso(
        form.applicationEndDate
      ),
    };

    if (!editingId) {
      payload.academicYear = form.academicYear;
    }

    if (pdfUrl) {
      payload.application = {
        pdfUrl,
        fileName,
      };
    }

    return payload;
  };

  // ==================================================
  // SAVE
  // ==================================================

  const handleSave = async (event) => {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const payload = buildPayload();

      if (editingId) {
        await entranceService.updateInformation(
          editingId,
          payload
        );

        setMessage("Entrance Information updated.");
      } else {
        await entranceService.createInformation(payload);
        setMessage("Entrance Information created.");
      }

      setFormOpen(false);
      setEditingId(null);
      await loadRecords();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // ==================================================
  // PUBLISH / ARCHIVE
  // ==================================================

  const handlePublication = async (record, action) => {
    if (busy) return;

    if (
      action === "publish" &&
      record.status !== "draft"
    ) {
      return;
    }

    if (
      action === "archive" &&
      record.status !== "published"
    ) {
      return;
    }

    const confirmation =
      action === "publish"
        ? "Publish this Entrance Information? Published records cannot be edited."
        : "Archive this Entrance Information? It will no longer appear on the public website.";

    if (!window.confirm(confirmation)) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (action === "publish") {
        // Read latest record to avoid publishing incomplete data.
        const detail =
          await entranceService.getInformation(record._id);

        if (
          !detail.requirements?.length ||
          !detail.awards?.length
        ) {
          throw new Error(
            "Requirements and Awards are required before publishing."
          );
        }

        await entranceService.publishInformation(
          record._id
        );

        setMessage("Entrance Information published.");
      } else {
        await entranceService.archiveInformation(
          record._id
        );

        setMessage("Entrance Information archived.");
      }

      await loadRecords();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // ==================================================
  // RECORD TABLE
  // ==================================================

  const renderTable = () => (
    <Box
      overflowX="auto"
      borderWidth="1px"
      borderRadius="lg"
    >
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Title</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>
              Published At
            </Table.ColumnHeader>
            {isInformation && (
              <Table.ColumnHeader>
                Actions
              </Table.ColumnHeader>
            )}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {records.map((record) => (
            <Table.Row key={record._id}>
              <Table.Cell>
                {record.title || "Untitled"}
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
                {formatDate(record.publishedAt)}
              </Table.Cell>

              {isInformation && (
                <Table.Cell>
                  <HStack gap={2} flexWrap="wrap">
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
                            handlePublication(
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
                          handlePublication(
                            record,
                            "archive"
                          )
                        }
                      >
                        Archive
                      </Button>
                    )}

                    {record.status === "archived" && (
                      <Text color="fg.muted" fontSize="xs">
                        Read-only
                      </Text>
                    )}
                  </HStack>
                </Table.Cell>
              )}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );

  // ==================================================
  // FORM
  // ==================================================

  const renderForm = () => (
    <Box
      as="form"
      onSubmit={handleSave}
      borderWidth="1px"
      borderRadius="lg"
      p={{ base: 4, md: 6 }}
    >
      <VStack align="stretch" gap={5}>
        <Heading size="md">
          {editingId
            ? "Edit Entrance Information"
            : "Create Entrance Information"}
        </Heading>

        <Field.Root required={!editingId}>
          <Field.Label>Academic Year</Field.Label>

          <NativeSelect.Root disabled={Boolean(editingId)}>
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

              {academicYears.map((year) => (
                <option
                  key={year._id}
                  value={year._id}
                >
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
            onChange={(event) =>
              changeField("title", event.target.value)
            }
            placeholder="2026 Entrance Information"
            required
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Description</Field.Label>

          <Textarea
            value={form.description}
            maxLength={10000}
            rows={4}
            onChange={(event) =>
              changeField(
                "description",
                event.target.value
              )
            }
          />
        </Field.Root>

        {/* REQUIREMENTS */}

        <Box>
          <Flex
            justify="space-between"
            align="center"
            mb={3}
            gap={3}
          >
            <Heading size="sm">
              Entrance Requirements
            </Heading>

            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={form.requirements.length >= 100}
              onClick={() =>
                addArrayItem("requirements")
              }
            >
              Add Requirement
            </Button>
          </Flex>

          <VStack align="stretch" gap={3}>
            {form.requirements.map((item, index) => (
              <Box
                key={index}
                borderWidth="1px"
                borderRadius="md"
                p={3}
              >
                <VStack align="stretch" gap={3}>
                  <Field.Root>
                    <Field.Label>
                      Requirement Title
                    </Field.Label>

                    <Input
                      maxLength={200}
                      value={item.title}
                      onChange={(event) =>
                        changeArrayItem(
                          "requirements",
                          index,
                          "title",
                          event.target.value
                        )
                      }
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      Requirement Description
                    </Field.Label>

                    <Textarea
                      maxLength={3000}
                      rows={3}
                      value={item.description}
                      onChange={(event) =>
                        changeArrayItem(
                          "requirements",
                          index,
                          "description",
                          event.target.value
                        )
                      }
                    />
                  </Field.Root>

                  <Button
                    type="button"
                    size="xs"
                    colorPalette="red"
                    variant="outline"
                    alignSelf="flex-end"
                    onClick={() =>
                      removeArrayItem(
                        "requirements",
                        index
                      )
                    }
                  >
                    Remove
                  </Button>
                </VStack>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* AWARDS */}

        <Box>
          <Flex
            justify="space-between"
            align="center"
            mb={3}
            gap={3}
          >
            <Heading size="sm">
              Awards / Degrees / Diplomas
            </Heading>

            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={form.awards.length >= 100}
              onClick={() =>
                addArrayItem("awards")
              }
            >
              Add Award
            </Button>
          </Flex>

          <VStack align="stretch" gap={3}>
            {form.awards.map((item, index) => (
              <Box
                key={index}
                borderWidth="1px"
                borderRadius="md"
                p={3}
              >
                <VStack align="stretch" gap={3}>
                  <Field.Root>
                    <Field.Label>
                      Award Title
                    </Field.Label>

                    <Input
                      maxLength={200}
                      value={item.awardTitle}
                      onChange={(event) =>
                        changeArrayItem(
                          "awards",
                          index,
                          "awardTitle",
                          event.target.value
                        )
                      }
                      placeholder="Diploma in Computer Science"
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      Description
                    </Field.Label>

                    <Textarea
                      maxLength={2000}
                      rows={3}
                      value={item.description}
                      onChange={(event) =>
                        changeArrayItem(
                          "awards",
                          index,
                          "description",
                          event.target.value
                        )
                      }
                    />
                  </Field.Root>

                  <Button
                    type="button"
                    size="xs"
                    colorPalette="red"
                    variant="outline"
                    alignSelf="flex-end"
                    onClick={() =>
                      removeArrayItem("awards", index)
                    }
                  >
                    Remove
                  </Button>
                </VStack>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* APPLICATION PDF */}

        <Heading size="sm">
          Application Form PDF
        </Heading>

        <Field.Root>
          <Field.Label>
            PDF URL (HTTPS)
          </Field.Label>

          <Input
            type="url"
            value={form.pdfUrl}
            placeholder="https://example.com/application.pdf"
            onChange={(event) =>
              changeField("pdfUrl", event.target.value)
            }
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>
            File Name
          </Field.Label>

          <Input
            maxLength={255}
            value={form.fileName}
            placeholder="ACC-Entrance-Application.pdf"
            onChange={(event) =>
              changeField("fileName", event.target.value)
            }
          />
        </Field.Root>

        {/* APPLICATION DATES */}

        <Heading size="sm">
          Application Dates
        </Heading>

        <Flex gap={4} flexWrap="wrap">
          <Box flex="1" minW="200px">
            <Field.Root>
              <Field.Label>
                Start Date
              </Field.Label>

              <Input
                type="date"
                value={form.applicationStartDate}
                onChange={(event) =>
                  changeField(
                    "applicationStartDate",
                    event.target.value
                  )
                }
              />
            </Field.Root>
          </Box>

          <Box flex="1" minW="200px">
            <Field.Root>
              <Field.Label>
                End Date
              </Field.Label>

              <Input
                type="date"
                value={form.applicationEndDate}
                onChange={(event) =>
                  changeField(
                    "applicationEndDate",
                    event.target.value
                  )
                }
              />
            </Field.Root>
          </Box>
        </Flex>

        <HStack justify="flex-end" gap={3}>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setFormOpen(false);
              setEditingId(null);
              setError("");
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
  );if (!isInformation) {
  return <EntranceListsManagement />;
}

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <Box p={{ base: 4, md: 6 }}>
      <VStack align="stretch" gap={6}>
        <Flex
          justify="space-between"
          align="center"
          flexWrap="wrap"
          gap={3}
        >
          <Box>
            <Heading size="lg">
              {isInformation
                ? "Entrance Information"
                : "Entrance Student Lists"}
            </Heading>

            <Text color="fg.muted" mt={2}>
              {isInformation
                ? "Manage entrance requirements, awards and application information."
                : "View academic entrance student lists."}
            </Text>
          </Box>

          <HStack gap={2}>
            {isInformation && !formOpen && (
              <Button
                colorPalette="blue"
                disabled={busy}
                onClick={openCreate}
              >
                Create Information
              </Button>
            )}

            <Button
              variant="outline"
              disabled={loading || busy}
              onClick={loadRecords}
            >
              Refresh
            </Button>
          </HStack>
        </Flex>

        {message && (
          <Box
            borderWidth="1px"
            borderColor="green.300"
            borderRadius="md"
            p={3}
          >
            <Text color="green.600">
              {message}
            </Text>
          </Box>
        )}

        {error && (
          <Box
            borderWidth="1px"
            borderColor="red.300"
            borderRadius="md"
            p={3}
          >
            <Text color="red.500">
              {error}
            </Text>
          </Box>
        )}

        {isInformation && formOpen && renderForm()}

        {loading ? (
          <HStack justify="center" py={10}>
            <Spinner />
            <Text>Loading...</Text>
          </HStack>
        ) : records.length === 0 ? (
          <Box
            borderWidth="1px"
            borderRadius="lg"
            p={8}
          >
            <Text>No records found.</Text>
          </Box>
        ) : (
          renderTable()
        )}
      </VStack>
    </Box>
  );
}
