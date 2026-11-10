import { useOutletContext } from "react-router-dom";

import { useCallback, useEffect, useState } from "react";
import {
  Badge, Box, Button, Field, Flex, Heading, Image,
  Input, Spinner, Table, Text, Textarea, VStack,
} from "@chakra-ui/react";
import DOMPurify from "dompurify";

import ImageUploader from "../../components/common/ImageUploader.jsx";
import ManagementToolbar from "../../components/dashboard/ManagementToolbar.jsx";
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
  imageMediaId: undefined,
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
  ["linkedinUrl", "LinkedIn URL", false],
  ["websiteUrl", "Website URL", false],
];

function OverlayPanel({
  children,
  onClose,
  wide = false,
}) {
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
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-label={
          wide
            ? "Faculty details"
            : "Faculty form"
        }
      >
        {children}
      </Flex>
    </Box>
  );
}

export default function FacultyManagement() {
  const { user } = useOutletContext() ?? {};
  const canManage = ["super_admin", "admin"].includes(user?.role);
  const isReadOnly = user?.role === "teacher";

  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewMember, setViewMember] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
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
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!formOpen && !viewMember) return;

    const onKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        !busy &&
        !imageUploading
      ) {
        setFormOpen(false);
        setViewMember(null);
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
  }, [
    formOpen,
    viewMember,
    busy,
    imageUploading,
  ]);

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const openCreate = () => {
    if (!canManage) return;
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const openEdit = (member) => {
    if (!canManage) return;
    const defaults = emptyForm();

    setEditingId(member._id);

    setForm(
      Object.fromEntries(
        Object.keys(defaults).map((key) => [
          key,
          key === "imageMediaId"
            ? (member[key] ?? undefined)
            : (member[key] ?? defaults[key]),
        ])
      )
    );

    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (busy || imageUploading) return;

    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  };

  const handleSave = async (event) => {
    if (!canManage) return;
    event.preventDefault();

    if (busy || imageUploading) return;

    setError("");
    setSuccess("");

    if (
      !form.name.trim() ||
      !form.position.trim() ||
      !form.department.trim()
    ) {
      setError(
        "Name, position and department are required."
      );
      return;
    }

    const order = Number(form.displayOrder);

    if (
      !Number.isInteger(order) ||
      order < 0
    ) {
      setError(
        "Display order must be a non-negative integer."
      );
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
        await facultyMemberService.update(
          editingId,
          payload
        );
      } else {
        await facultyMemberService.create(
          payload
        );
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
    if (!canManage) return;
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
      await facultyMemberService.setPublication(
        member._id,
        next
      );

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
    if (!canManage) return;
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
      await facultyMemberService.remove(
        member._id
      );

      await loadMembers();

      setSuccess(
        "Faculty profile deleted."
      );
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleView = async (member) => {
    if (!member.isPublished) {
      setViewMember(member);
      return;
    }

    setError("");

    try {
      const data =
        await facultyMemberService.getById(
          member._id
        );

      setViewMember(data.member);
    } catch (err) {
      setError(getError(err));
    }
  };

  const filteredMembers = members.filter(
    (member) => {
      if (
        statusFilter === "active" &&
        member.isActive !== true
      ) {
        return false;
      }

      if (
        statusFilter === "inactive" &&
        member.isActive !== false
      ) {
        return false;
      }

      const query =
        search.trim().toLowerCase();

      return [
        member.name,
        member.position,
        member.department,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );
    }
  );

  if (loading) {
    return (
      <Flex
        minH="300px"
        align="center"
        justify="center"
      >
        <Spinner size="lg" />
      </Flex>
    );
  }

  return (
    <Box width="100%" py="6">
      <VStack align="stretch" gap="6">
        {/* HEADER */}

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

            <Text
              color="fg.muted"
              mt="1"
            >
              {isReadOnly ? "View faculty profiles (read-only)." : "Manage faculty profiles and public visibility."}
            </Text>
          </Box>

          {canManage && (
<Button
            colorPalette="blue"
            disabled={busy || imageUploading}
            onClick={openCreate}
          >
            + Add Faculty
          </Button>
)}
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

        {/* FACULTY TABLE */}

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

              <Text
                fontSize="sm"
                color="fg.muted"
              >
                {members.length} total profiles
              </Text>
            </Box>

            <ManagementToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search faculty..."
              filters={[
                {
                  key: "status",
                  label: "Status filter",
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    {
                      label: "All Status",
                      value: "all",
                    },
                    {
                      label: "Active",
                      value: "active",
                    },
                    {
                      label: "Inactive",
                      value: "inactive",
                    },
                  ],
                },
              ]}
            />
          </Flex>

          <Box overflowX="auto">
            <Table.Root
              size="sm"
              variant="line"
            >
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
                        <Flex
                          align="center"
                          gap="3"
                          minW="190px"
                        >
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

                            <Text
                              fontSize="xs"
                              color="fg.muted"
                            >
                              {member.position}
                            </Text>
                          </Box>
                        </Flex>
                      </Table.Cell>

                      <Table.Cell>
                        {member.department}
                      </Table.Cell>

                      <Table.Cell>
                        <VStack
                          align="start"
                          gap="1"
                        >
                          <Badge
                            colorPalette={
                              member.isPublished
                                ? "green"
                                : "gray"
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
                        {member.displayOrder}
                      </Table.Cell>

                      <Table.Cell textAlign="end">
                        <Flex
                          gap="2"
                          justify="flex-end"
                          wrap="wrap"
                        >
                          <Button
                              size="xs"
                              variant="outline"
                              disabled={busy || imageUploading}
                              onClick={() =>
                                handleView(member)
                              }
                            >
                              View
                            </Button>

                          {canManage && (
<Button
                            size="xs"
                            variant="outline"
                            disabled={busy || imageUploading}
                            onClick={() =>
                              openEdit(member)
                            }
                          >
                            Edit
                          </Button>
)}

                          {canManage && (
<Button
                            size="xs"
                            colorPalette={
                              member.isPublished
                                ? "orange"
                                : "green"
                            }
                            variant="outline"
                            disabled={busy || imageUploading}
                            onClick={() =>
                              handlePublication(member)
                            }
                          >
                            {member.isPublished
                              ? "Unpublish"
                              : "Publish"}
                          </Button>
)}

                          {canManage && (
<Button
                            size="xs"
                            colorPalette="red"
                            variant="outline"
                            disabled={busy || imageUploading}
                            onClick={() =>
                              handleDelete(member)
                            }
                          >
                            Delete
                          </Button>
)}
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

      {/* CREATE / EDIT PANEL */}

      {canManage && formOpen && (
        <OverlayPanel onClose={closeForm}>
          <Flex
            p="5"
            justify="space-between"
            align="center"
            borderBottomWidth="1px"
          >
            <Box>
              <Heading size="lg">
                {editingId
                  ? "Edit Faculty"
                  : "Create Faculty"}
              </Heading>

              <Text
                fontSize="sm"
                color="fg.muted"
              >
                Faculty and staff information
              </Text>
            </Box>

            <Button
              variant="ghost"
              disabled={busy || imageUploading}
              onClick={closeForm}
            >
              Close
            </Button>
          </Flex>

          <Box
            flex="1"
            overflowY="auto"
            p="5"
          >
            <form
              id="faculty-form"
              onSubmit={handleSave}
            >
              <VStack
                align="stretch"
                gap="4"
              >
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

                <Field.Root>
                  <Field.Label>
                    Faculty Profile Image
                  </Field.Label>

                  <ImageUploader
                    category="faculties"
                    value={form.image}
                    onUploaded={(image) => {
                      if (
                        !image?.mediaId ||
                        !image?.url
                      ) {
                        setError(
                          "Upload response is missing mediaId or URL."
                        );
                        return;
                      }

                      setForm((previous) => ({
                        ...previous,
                        image: image.url,
                        imageMediaId: image.mediaId,
                      }));
                    }}
                    onUploadingChange={
                      setImageUploading
                    }
                  />

                  {form.image && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      colorPalette="red"
                      disabled={busy || imageUploading}
                      onClick={() =>
                        setForm((previous) => ({
                          ...previous,
                          image: "",
                          imageMediaId: null,
                        }))
                      }
                    >
                      Remove Image
                    </Button>
                  )}

                  <Text
                    fontSize="xs"
                    color="fg.muted"
                  >
                    Upload JPG, PNG or WebP (max 5 MB).
                    Unused uploads are cleaned up by the backend.
                  </Text>
                </Field.Root>

                {fields.map(
                  ([key, label, required]) => (
                    <Field.Root
                      key={key}
                      required={required}
                    >
                      <Field.Label>
                        {label}
                      </Field.Label>

                      <Input
                        value={form[key]}
                        disabled={
                          busy || imageUploading
                        }
                        type={
                          key === "email"
                            ? "email"
                            : "text"
                        }
                        maxLength={
                          key === "name"
                            ? 150
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
                  )
                )}

                <Field.Root>
                  <Field.Label>
                    Short Biography
                  </Field.Label>

                  <Textarea
                    rows={4}
                    value={form.bio}
                    disabled={busy || imageUploading}
                    maxLength={5000}
                    onChange={(event) =>
                      updateField(
                        "bio",
                        event.target.value
                      )
                    }
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>
                    Detailed Description
                  </Field.Label>

                  <Box
                    width="100%"
                    minW="0"
                  >
                    <RichTextEditor
                      value={form.description}
                      onChange={(value) =>
                        updateField(
                          "description",
                          value
                        )
                      }
                      minHeight="180px"
                      disabled={
                        busy || imageUploading
                      }
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
                    disabled={busy || imageUploading}
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
              disabled={busy || imageUploading}
              onClick={closeForm}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="faculty-form"
              colorPalette="blue"
              loading={busy}
              disabled={busy || imageUploading}
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
          onClose={() =>
            setViewMember(null)
          }
        >
          <Flex
            p="5"
            align="center"
            justify="space-between"
            borderBottomWidth="1px"
          >
            <Heading size="lg">
              Faculty Details
            </Heading>

            <Button
              variant="outline"
              onClick={() =>
                setViewMember(null)
              }
            >
              Close
            </Button>
          </Flex>

          <Box
            flex="1"
            overflowY="auto"
            p="6"
          >
            <VStack
              align="stretch"
              gap="5"
            >
              {viewMember.image && (
                <Image
                  src={viewMember.image}
                  alt={viewMember.name}
                  maxH="220px"
                  maxW="220px"
                  borderRadius="xl"
                  objectFit="cover"
                />
              )}

              <Box>
                <Heading size="xl">
                  {viewMember.name}
                </Heading>

                <Text
                  mt="2"
                  fontWeight="medium"
                >
                  {viewMember.position}
                </Text>

                <Text color="fg.muted">
                  {viewMember.department}
                </Text>

                <Badge
                  colorPalette="green"
                  mt="3"
                >
                  Published
                </Badge>
              </Box>

              {viewMember.bio && (
                <Text whiteSpace="pre-wrap">
                  {viewMember.bio}
                </Text>
              )}

              {viewMember.description && (
                <Box
                  lineHeight="1.8"
                  css={{
                    "& p": {
                      marginBottom: "12px",
                    },
                    "& ul": {
                      paddingLeft: "24px",
                      listStyleType: "disc",
                    },
                    "& ol": {
                      paddingLeft: "24px",
                      listStyleType: "decimal",
                    },
                    "& a": {
                      color:
                        "var(--chakra-colors-blue-500)",
                      textDecoration: "underline",
                    },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      viewMember.description
                    ),
                  }}
                />
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
