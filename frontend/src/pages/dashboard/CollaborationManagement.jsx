
import { useCallback, useEffect, useState } from "react";
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
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import DOMPurify from "dompurify";

import ManagementToolbar from "../../components/dashboard/ManagementToolbar.jsx";
import RichTextEditor from "../../components/dashboard/about/RichTextEditor.jsx";
import { collaborationPartnerService } from "../../services/collaborationPartner.service.js";

const emptyForm = () => ({
  name: "",
  type: "",
  logo: "",
  shortDescription: "",
  description: "",
  websiteUrl: "",
  email: "",
  displayOrder: 0,
});

const getError = (error) => {
  const data = error?.response?.data;
  return data?.message || error?.message || "Something went wrong.";
};

const hasText = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim().length > 0;

const fields = [
  ["name", "Organization Name", true],
  ["type", "Partner Type", true],
  ["logo", "Logo URL / Local Path", false],
  ["websiteUrl", "Website URL", false],
  ["email", "Contact Email", false],
];

function SidePanel({ children, onClose, title }) {
  return (
    <Box
      position="fixed"
      inset="0"
      zIndex={1500}
      bg="blackAlpha.600"
      onClick={onClose}
    >
      <Flex
        role="dialog"
        aria-modal="true"
        aria-label={title}
        position="absolute"
        right="0"
        top="0"
        bottom="0"
        width="100%"
        maxW="620px"
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

export default function CollaborationManagement() {
  const [partners, setPartners] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewPartner, setViewPartner] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPartners = useCallback(async () => {
    try {
      const data = await collaborationPartnerService.getAll();
      setPartners(data.partners || []);
      return true;
    } catch (err) {
      setError(getError(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

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

  const openEdit = (partner) => {
    const defaults = emptyForm();

    setEditingId(partner._id);

    setForm(
      Object.fromEntries(
        Object.keys(defaults).map((key) => [
          key,
          partner[key] ?? defaults[key],
        ])
      )
    );

    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (busy) return;

    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.type.trim()) {
      setError("Organization name and partner type are required.");
      return;
    }

    const order = Number(form.displayOrder);

    if (!Number.isInteger(order) || order < 0) {
      setError("Display order must be a non-negative integer.");
      return;
    }

    const payload = {
      ...form,
      displayOrder: order,
      description: hasText(form.description)
        ? form.description
        : "",
    };

    setBusy(true);

    try {
      if (editingId) {
        await collaborationPartnerService.update(
          editingId,
          payload
        );
      } else {
        await collaborationPartnerService.create(payload);
      }

      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm());

      setSuccess(
        editingId
          ? "Partner updated successfully."
          : "Partner created successfully."
      );

      await loadPartners();
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePublication = async (partner) => {
    const next = !partner.isPublished;

    if (
      !window.confirm(
        `${next ? "Publish" : "Unpublish"} ${partner.name}?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await collaborationPartnerService.setPublication(
        partner._id,
        next
      );

      setSuccess(
        next
          ? "Partner published successfully."
          : "Partner unpublished successfully."
      );

      await loadPartners();
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (partner) => {
    if (
      !window.confirm(
        `Permanently delete ${partner.name}? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await collaborationPartnerService.remove(partner._id);

      setSuccess("Partner deleted successfully.");
      await loadPartners();
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleView = async (partner) => {
    if (!partner.isPublished) return;

    setError("");

    try {
      const data =
        await collaborationPartnerService.getById(partner._id);

      setViewPartner(data.partner);
    } catch (err) {
      setError(getError(err));
    }
  };

  const filteredPartners = partners.filter((partner) => {
    if (statusFilter === "active" && partner.isActive !== true) return false;
    if (statusFilter === "inactive" && partner.isActive !== false) return false;
    const query = search.trim().toLowerCase();

    return [partner.name, partner.type].some((value) =>
      String(value || "").toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <Flex minH="300px" align="center" justify="center">
        <Spinner size="lg" />
      </Flex>
    );
  }

  return (
    <Box width="100%" py="6">
      <VStack align="stretch" gap="6">
        <Flex
          justify="space-between"
          align="center"
          gap="4"
          wrap="wrap"
        >
          <Box>
            <Heading size="xl">
              Collaboration Management
            </Heading>

            <Text color="fg.muted" mt="1">
              Manage partner organizations and public visibility.
            </Text>
          </Box>

          <Button
            colorPalette="blue"
            disabled={busy}
            onClick={openCreate}
          >
            + Add Partner
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

        {/* FULL WIDTH TABLE */}

        <Box
          borderWidth="1px"
          borderRadius="xl"
          overflow="hidden"
        >
          <Flex
            p="5"
            gap="4"
            justify="space-between"
            align="center"
            wrap="wrap"
          >
            <Box>
              <Heading size="md">
                Collaboration Partners
              </Heading>

              <Text fontSize="sm" color="fg.muted">
                {partners.length} total partners
              </Text>
            </Box>

            <ManagementToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search partners..."
              filters={[{
                key: "status",
                label: "Status filter",
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { label: "All Status", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ],
              }]}
            />
          </Flex>

          <Box overflowX="auto">
            <Table.Root size="sm" variant="line">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>
                    Partner
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Type
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Status
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Order
                  </Table.ColumnHeader>

                  <Table.ColumnHeader textAlign="end">
                    Actions
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {filteredPartners.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5}>
                      <Text
                        py="8"
                        textAlign="center"
                        color="fg.muted"
                      >
                        No collaboration partners found.
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filteredPartners.map((partner) => (
                    <Table.Row key={partner._id}>
                      <Table.Cell>
                        <Flex
                          align="center"
                          gap="3"
                          minW="190px"
                        >
                          {partner.logo ? (
                            <Image
                              src={partner.logo}
                              alt={partner.name}
                              boxSize="48px"
                              objectFit="contain"
                              borderRadius="lg"
                            />
                          ) : (
                            <Flex
                              boxSize="48px"
                              bg="bg.muted"
                              borderRadius="lg"
                              align="center"
                              justify="center"
                              flexShrink={0}
                              fontWeight="bold"
                            >
                              {partner.name?.charAt(0)}
                            </Flex>
                          )}

                          <Text fontWeight="semibold">
                            {partner.name}
                          </Text>
                        </Flex>
                      </Table.Cell>

                      <Table.Cell>
                        {partner.type}
                      </Table.Cell>

                      <Table.Cell>
                        <VStack align="start" gap="1">
                          <Badge
                            colorPalette={
                              partner.isPublished
                                ? "green"
                                : "gray"
                            }
                          >
                            {partner.isPublished
                              ? "Published"
                              : "Draft"}
                          </Badge>

                          {!partner.isActive && (
                            <Badge colorPalette="orange">
                              Inactive
                            </Badge>
                          )}
                        </VStack>
                      </Table.Cell>

                      <Table.Cell>
                        {partner.displayOrder ?? 0}
                      </Table.Cell>

                      <Table.Cell textAlign="end">
                        <Flex
                          gap="2"
                          justify="flex-end"
                          wrap="wrap"
                        >
                          {partner.isPublished && (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleView(partner)}
                            >
                              View
                            </Button>
                          )}

                          <Button
                            size="xs"
                            variant="outline"
                            disabled={busy}
                            onClick={() => openEdit(partner)}
                          >
                            Edit
                          </Button>

                          <Button
                            size="xs"
                            colorPalette="blue"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              handlePublication(partner)
                            }
                          >
                            {partner.isPublished
                              ? "Unpublish"
                              : "Publish"}
                          </Button>

                          <Button
                            size="xs"
                            colorPalette="red"
                            variant="outline"
                            disabled={busy}
                            onClick={() => handleDelete(partner)}
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
        <SidePanel
          title="Collaboration partner form"
          onClose={closeForm}
        >
          <Flex
            p="5"
            justify="space-between"
            align="center"
            borderBottomWidth="1px"
          >
            <Box>
              <Heading size="lg">
                {editingId
                  ? "Edit Partner"
                  : "Create Partner"}
              </Heading>

              <Text fontSize="sm" color="fg.muted">
                Organization information
              </Text>
            </Box>

            <Button
              variant="ghost"
              disabled={busy}
              onClick={closeForm}
            >
              Close
            </Button>
          </Flex>

          <Box flex="1" overflowY="auto" p="5">
            <form
              id="collaboration-form"
              onSubmit={handleSave}
            >
              <VStack align="stretch" gap="4">
                {error && (
                  <Box
                    p="3"
                    borderWidth="1px"
                    borderColor="red.300"
                    color="red.600"
                    borderRadius="md"
                    role="alert"
                  >
                    {error}
                  </Box>
                )}

                {fields.map(([key, label, required]) => (
                  <Field.Root
                    key={key}
                    required={required}
                  >
                    <Field.Label>{label}</Field.Label>

                    <Input
                      value={form[key]}
                      disabled={busy}
                      type={
                        key === "email" ? "email" : "text"
                      }
                      maxLength={
                        key === "name"
                          ? 150
                          : key === "type"
                            ? 100
                            : key === "email"
                              ? 254
                              : 2048
                      }
                      onChange={(event) =>
                        updateField(
                          key,
                          event.target.value
                        )
                      }
                    />
                  </Field.Root>
                ))}

                <Field.Root>
                  <Field.Label>
                    Short Description
                  </Field.Label>

                  <Textarea
                    rows={3}
                    value={form.shortDescription}
                    maxLength={5000}
                    disabled={busy}
                    onChange={(event) =>
                      updateField(
                        "shortDescription",
                        event.target.value
                      )
                    }
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>
                    Detailed Description
                  </Field.Label>

                  <Box width="100%" minW="0">
                    <RichTextEditor
                      value={form.description}
                      onChange={(value) =>
                        updateField(
                          "description",
                          value
                        )
                      }
                      minHeight="180px"
                      disabled={busy}
                    />
                  </Box>
                </Field.Root>

                <Field.Root>
                  <Field.Label>
                    Display Order
                  </Field.Label>

                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={form.displayOrder}
                    disabled={busy}
                    onChange={(event) =>
                      updateField(
                        "displayOrder",
                        event.target.value
                      )
                    }
                  />
                </Field.Root>
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
              form="collaboration-form"
              colorPalette="blue"
              loading={busy}
              disabled={busy}
            >
              {editingId
                ? "Save Changes"
                : "Create Partner"}
            </Button>
          </Flex>
        </SidePanel>
      )}

      {/* PUBLISHED DETAIL PREVIEW */}

      {viewPartner && (
        <SidePanel
          title="Collaboration partner details"
          onClose={() => setViewPartner(null)}
        >
          <Flex
            p="5"
            align="center"
            justify="space-between"
            borderBottomWidth="1px"
          >
            <Heading size="lg">
              Partner Details
            </Heading>

            <Button
              variant="outline"
              onClick={() => setViewPartner(null)}
            >
              Close
            </Button>
          </Flex>

          <Box flex="1" overflowY="auto" p="6">
            <VStack align="stretch" gap="5">
              {viewPartner.logo && (
                <Image
                  src={viewPartner.logo}
                  alt={viewPartner.name}
                  maxH="150px"
                  maxW="260px"
                  objectFit="contain"
                />
              )}

              <Box>
                <Heading size="xl">
                  {viewPartner.name}
                </Heading>

                <Text mt="2" color="fg.muted">
                  {viewPartner.type}
                </Text>

                <Badge colorPalette="green" mt="3">
                  Published
                </Badge>
              </Box>

              {viewPartner.shortDescription && (
                <Text whiteSpace="pre-wrap">
                  {viewPartner.shortDescription}
                </Text>
              )}

              {viewPartner.description && (
                <Box
                  lineHeight="1.8"
                  css={{
                    "& p": { marginBottom: "12px" },
                    "& ul": {
                      paddingLeft: "24px",
                      listStyleType: "disc",
                    },
                    "& ol": {
                      paddingLeft: "24px",
                      listStyleType: "decimal",
                    },
                    "& a": {
                      color: "var(--chakra-colors-blue-500)",
                      textDecoration: "underline",
                    },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      viewPartner.description
                    ),
                  }}
                />
              )}

              {viewPartner.websiteUrl && (
                <Text>
                  Website: {viewPartner.websiteUrl}
                </Text>
              )}

              {viewPartner.email && (
                <Text>
                  Email: {viewPartner.email}
                </Text>
              )}
            </VStack>
          </Box>
        </SidePanel>
      )}
    </Box>
  );
}
