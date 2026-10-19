
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

import RichTextEditor from "../../components/dashboard/about/RichTextEditor.jsx";
import { facultyMemberService } from "../../services/facultyMember.service.js";

const emptyForm = () => ({
  name: "",
  position: "",
  department: "",
  bio: "",
  description: "",
  email: "",
  linkedinUrl: "",
  websiteUrl: "",
  image: "",
  displayOrder: 0,
});

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong.";

const hasText = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim().length > 0;

const fields = [
  ["name", "Full Name", true],
  ["position", "Position", true],
  ["department", "Department", true],
  ["email", "Public Email", false],
  ["image", "Image URL / Local Image Path", false],
  ["linkedinUrl", "LinkedIn URL", false],
  ["websiteUrl", "Website URL", false],
];

function OverlayPanel({ children, onClose, wide = false }) {
  return (
    <Box
      position="fixed"
      inset="0"
      zIndex={1500}
      bg="blackAlpha.600"
      onClick={onClose}
    >
      <Flex
        position="absolute"
        top="0"
        right="0"
        bottom="0"
        width="100%"
        maxW={wide ? "750px" : "580px"}
        bg="bg.panel"
        boxShadow="2xl"
        direction="column"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={wide ? "Faculty details" : "Faculty form"}
      >
        {children}
      </Flex>
    </Box>
  );
}

export default function FacultyManagement() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewMember, setViewMember] = useState(null);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMembers = useCallback(async () => {
    try {
      const data = await facultyMemberService.getAll();
      setMembers(data.members || []);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!formOpen && !viewMember) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        setFormOpen(false);
        setViewMember(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () =>
      window.removeEventListener("keydown", onKeyDown);
  }, [formOpen, viewMember, busy]);

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

  const openEdit = (member) => {
    const defaults = emptyForm();

    setEditingId(member._id);
    setForm(
      Object.fromEntries(
        Object.keys(defaults).map((key) => [
          key,
          member[key] ?? defaults[key],
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

    if (
      !form.name.trim() ||
      !form.position.trim() ||
      !form.department.trim()
    ) {
      setError("Name, position and department are required.");
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
        await facultyMemberService.update(editingId, payload);
      } else {
        await facultyMemberService.create(payload);
      }

      await loadMembers();

      setSuccess(
        editingId
          ? "Faculty profile updated successfully."
          : "Faculty profile created successfully."
      );

      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm());
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePublication = async (member) => {
    const next = !member.isPublished;

    if (
      !window.confirm(
        `${next ? "Publish" : "Unpublish"} ${member.name}?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await facultyMemberService.setPublication(member._id, next);
      await loadMembers();

      setSuccess(
        next
          ? "Faculty profile published."
          : "Faculty profile unpublished."
      );
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (member) => {
    if (
      !window.confirm(
        `Permanently delete ${member.name}? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await facultyMemberService.remove(member._id);
      await loadMembers();
      setSuccess("Faculty profile deleted.");
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleView = async (member) => {
    if (!member.isPublished) return;

    setError("");

    try {
      const data = await facultyMemberService.getById(member._id);
      setViewMember(data.member);
    } catch (err) {
      setError(getError(err));
    }
  };

  const filteredMembers = members.filter((member) => {
    const query = search.trim().toLowerCase();

    return [
      member.name,
      member.position,
      member.department,
    ].some((value) =>
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
        {/* PAGE HEADER */}

        <Flex
          justify="space-between"
          align="center"
          gap="4"
          wrap="wrap"
        >
          <Box>
            <Heading size="xl">
              Faculties & Staff
            </Heading>

            <Text color="fg.muted" mt="1">
              Manage faculty profiles and public visibility.
            </Text>
          </Box>

          <Button colorPalette="blue" onClick={openCreate}>
            + Add Faculty
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
                Faculty Profiles
              </Heading>

              <Text fontSize="sm" color="fg.muted">
                {members.length} total profiles
              </Text>
            </Box>

            <Flex gap="2" wrap="wrap">
              <Input
                placeholder="Search faculty..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                maxW="260px"
              />

              <Button
                variant="outline"
                disabled={busy}
                onClick={loadMembers}
              >
                Refresh
              </Button>
            </Flex>
          </Flex>

          <Box overflowX="auto">
            <Table.Root size="sm" variant="line">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>
                    Faculty Member
                  </Table.ColumnHeader>

                  <Table.ColumnHeader>
                    Department
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
                {filteredMembers.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5}>
                      <Text
                        py="8"
                        textAlign="center"
                        color="fg.muted"
                      >
                        No faculty profiles found.
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filteredMembers.map((member) => (
                    <Table.Row key={member._id}>
                      <Table.Cell>
                        <Flex align="center" gap="3" minW="190px">
                          {member.image ? (
                            <Image
                              src={member.image}
                              alt={member.name}
                              boxSize="48px"
                              borderRadius="lg"
                              objectFit="cover"
                            />
                          ) : (
                            <Flex
                              boxSize="48px"
                              flexShrink={0}
                              borderRadius="lg"
                              bg="bg.muted"
                              align="center"
                              justify="center"
                              fontWeight="bold"
                            >
                              {member.name?.charAt(0)}
                            </Flex>
                          )}

                          <Box>
                            <Text fontWeight="semibold">
                              {member.name}
                            </Text>

                            <Text fontSize="xs" color="fg.muted">
                              {member.position}
                            </Text>
                          </Box>
                        </Flex>
                      </Table.Cell>

                      <Table.Cell>
                        {member.department}
                      </Table.Cell>

                      <Table.Cell>
                        <VStack align="start" gap="1">
                          <Badge
                            colorPalette={
                              member.isPublished ? "green" : "gray"
                            }
                          >
                            {member.isPublished
                              ? "Published"
                              : "Draft"}
                          </Badge>

                          {!member.isActive && (
                            <Badge colorPalette="orange">
                              Inactive
                            </Badge>
                          )}
                        </VStack>
                      </Table.Cell>

                      <Table.Cell>
                        {member.displayOrder ?? 0}
                      </Table.Cell>

                      <Table.Cell textAlign="end">
                        <Flex
                          gap="2"
                          justify="flex-end"
                          wrap="wrap"
                        >
                          {member.isPublished && (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleView(member)}
                            >
                              View
                            </Button>
                          )}

                          <Button
                            size="xs"
                            variant="outline"
                            disabled={busy}
                            onClick={() => openEdit(member)}
                          >
                            Edit
                          </Button>

                          <Button
                            size="xs"
                            colorPalette="blue"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              handlePublication(member)
                            }
                          >
                            {member.isPublished
                              ? "Unpublish"
                              : "Publish"}
                          </Button>

                          <Button
                            size="xs"
                            colorPalette="red"
                            variant="outline"
                            disabled={busy}
                            onClick={() => handleDelete(member)}
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

      {/* CREATE / EDIT SLIDE-IN PANEL */}

      {formOpen && (
        <OverlayPanel onClose={closeForm}>
          <Flex
            p="5"
            align="center"
            justify="space-between"
            borderBottomWidth="1px"
          >
            <Box>
              <Heading size="lg">
                {editingId
                  ? "Edit Faculty"
                  : "Create Faculty"}
              </Heading>

              <Text fontSize="sm" color="fg.muted">
                Faculty profile information
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
            <form id="faculty-form" onSubmit={handleSave}>
              <VStack align="stretch" gap="4">
                {error && (
                  <Box
                    p="3"
                    borderWidth="1px"
                    borderColor="red.300"
                    borderRadius="md"
                    color="red.600"
                    role="alert"
                  >
                    {error}
                  </Box>
                )}

                {fields.map(([key, label, required]) => (
                  <Field.Root key={key} required={required}>
                    <Field.Label>{label}</Field.Label>

                    <Input
                      value={form[key]}
                      disabled={busy}
                      type={key === "email" ? "email" : "text"}
                      maxLength={
                        ["name", "position", "department"].includes(key)
                          ? 150
                          : key === "email"
                            ? 254
                            : 2048
                      }
                      onChange={(event) =>
                        updateField(key, event.target.value)
                      }
                    />
                  </Field.Root>
                ))}

                <Field.Root>
                  <Field.Label>
                    Bio (Short Summary)
                  </Field.Label>

                  <Textarea
                    rows={3}
                    value={form.bio}
                    maxLength={5000}
                    disabled={busy}
                    onChange={(event) =>
                      updateField("bio", event.target.value)
                    }
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>
                    Description (Detailed Profile)
                  </Field.Label>

                  <Box width="100%" minW="0">
                    <RichTextEditor
                      value={form.description}
                      onChange={(value) =>
                        updateField("description", value)
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
            borderTopWidth="1px"
            justify="flex-end"
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
              form="faculty-form"
              colorPalette="blue"
              loading={busy}
              disabled={busy}
            >
              {editingId
                ? "Save Changes"
                : "Create Faculty"}
            </Button>
          </Flex>
        </OverlayPanel>
      )}

      {/* PUBLISHED DETAIL PREVIEW */}

      {viewMember && (
        <OverlayPanel
          wide
          onClose={() => setViewMember(null)}
        >
          <Flex
            p="5"
            justify="space-between"
            align="center"
            borderBottomWidth="1px"
          >
            <Box>
              <Heading size="lg">
                Faculty Details
              </Heading>

              <Text fontSize="sm" color="fg.muted">
                Published profile preview
              </Text>
            </Box>

            <Button
              variant="outline"
              onClick={() => setViewMember(null)}
            >
              Close
            </Button>
          </Flex>

          <Box flex="1" overflowY="auto" p="6">
            <VStack align="stretch" gap="5">
              <Flex
                gap="5"
                align="center"
                wrap="wrap"
              >
                {viewMember.image && (
                  <Image
                    src={viewMember.image}
                    alt={viewMember.name}
                    boxSize="130px"
                    borderRadius="xl"
                    objectFit="cover"
                  />
                )}

                <Box>
                  <Heading size="xl">
                    {viewMember.name}
                  </Heading>

                  <Text mt="2">
                    {viewMember.position}
                  </Text>

                  <Text color="fg.muted">
                    {viewMember.department}
                  </Text>

                  <Badge colorPalette="green" mt="3">
                    Published
                  </Badge>
                </Box>
              </Flex>

              {viewMember.bio && (
                <Box>
                  <Heading size="sm" mb="2">
                    Biography
                  </Heading>

                  <Text whiteSpace="pre-wrap">
                    {viewMember.bio}
                  </Text>
                </Box>
              )}

              {viewMember.description && (
                <Box>
                  <Heading size="sm" mb="3">
                    Detailed Profile
                  </Heading>

                  <Box
                    className="faculty-description"
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
                        viewMember.description
                      ),
                    }}
                  />
                </Box>
              )}

              {viewMember.email && (
                <Text>
                  Email: {viewMember.email}
                </Text>
              )}

              {viewMember.linkedinUrl && (
                <Text>
                  LinkedIn: {viewMember.linkedinUrl}
                </Text>
              )}

              {viewMember.websiteUrl && (
                <Text>
                  Website: {viewMember.websiteUrl}
                </Text>
              )}
            </VStack>
          </Box>
        </OverlayPanel>
      )}
    </Box>
  );
}
