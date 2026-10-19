
import { useEffect, useState } from "react";

import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";

import { Link as RouterLink } from "react-router-dom";
import { useUser } from "@clerk/react";

import { dashboardService } from "../../services/dashboard.service.js";

const PAGE_SIZE = 10;

// ==================================================
// HELPERS
// ==================================================

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const getRoleLabel = (role) => {
  return String(role || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

// ==================================================
// USER MANAGEMENT
// ==================================================

export default function UserManagement() {
  const { user: clerkUser } = useUser();

  // IMPORTANT:
  // Clerk publicMetadata must be managed by the
  // trusted backend. It is used here only to
  // control presentation, never authorization.

  const currentRole =
    clerkUser?.publicMetadata?.role || "";

  const isSuperAdmin =
    currentRole === "super_admin";

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // ==================================================
  // EDIT STATE
  // ==================================================

  const [editingUser, setEditingUser] = useState(null);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
  });

  const [saving, setSaving] = useState(false);

  // ==================================================
  // LOAD USERS — ORIGINAL LOGIC
  // ==================================================

  useEffect(() => {
    const controller = new AbortController();

    const loadUsers = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await dashboardService.getUsers(
          {
            page,
            limit: PAGE_SIZE,
            ...(role ? { role } : {}),
            ...(search ? { search } : {}),
          },
          controller.signal
        );

        if (controller.signal.aborted) return;

        setUsers(result.users ?? []);

        setPagination(
          result.pagination ?? {
            page,
            total: 0,
            totalPages: 0,
          }
        );
      } catch (err) {
        if (controller.signal.aborted) return;

        setUsers([]);
        setError(
          getErrorMessage(
            err,
            "Unable to load users."
          )
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => controller.abort();
  }, [page, role, search, reloadKey]);

  // ==================================================
  // SEARCH — ORIGINAL LOGIC
  // ==================================================

  const handleSearch = (event) => {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  };

  // ==================================================
  // OPEN EDIT FORM — ORIGINAL LOGIC
  // ==================================================

  const openEdit = (user) => {
    setError("");
    setSuccess("");

    setEditingUser(user);

    setEditForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    });
  };

  // ==================================================
  // SAVE USER — ORIGINAL LOGIC
  // ==================================================

  const saveUser = async (event) => {
    event.preventDefault();

    if (!editingUser || saving) return;

    const firstName = editForm.firstName.trim();
    const lastName = editForm.lastName.trim();

    if (!firstName || !lastName) {
      setError(
        "First name and last name are required."
      );
      return;
    }

    const changes = {};

    if (firstName !== editingUser.firstName) {
      changes.firstName = firstName;
    }

    if (lastName !== editingUser.lastName) {
      changes.lastName = lastName;
    }

    if (Object.keys(changes).length === 0) {
      setEditingUser(null);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await dashboardService.updateUser(
        editingUser._id,
        changes
      );

      setEditingUser(null);

      setSuccess(
        "User information updated successfully."
      );

      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to update user."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // THEME STYLES — PRESENTATION ONLY
  // ==================================================

  const cardStyles = {
    bg: "var(--mg-surface)",
    color: "var(--mg-text)",
    border: "1px solid var(--mg-border)",
    borderRadius: "14px",
  };

  const inputStyles = {
    bg: "var(--mg-surface-alt)",
    color: "var(--mg-text)",
    borderColor: "var(--mg-border)",
    _placeholder: {
      color: "var(--mg-muted)",
    },
    _focusVisible: {
      borderColor: "var(--mg-accent)",
      outlineColor: "var(--mg-accent)",
    },
  };

  const outlineButtonStyles = {
    bg: "transparent",
    color: "var(--mg-text)",
    borderColor: "var(--mg-border)",
    _hover: {
      bg: "var(--mg-surface-alt)",
    },
  };

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <VStack
      className="acc-management"
      align="stretch"
      gap={5}
      w="100%"
      minW="0"
      color="var(--mg-text)"
    >
      {/* ========================================== */}
      {/* PAGE HEADING */}
      {/* ========================================== */}

      <Flex
        justify="space-between"
        align="center"
        flexWrap="wrap"
        gap={4}
      >
        <Box>
          <HStack gap={2} mb={2}>
            <Box
              w="4px"
              h="28px"
              bg="#F2A23A"
              borderRadius="full"
            />

            <Heading
              size="2xl"
              color="var(--mg-text)"
              fontWeight="750"
              letterSpacing="-0.03em"
            >
              User Management
            </Heading>
          </HStack>

          <Text
            color="var(--mg-muted)"
            fontSize="sm"
          >
            Manage ACC staff and student accounts.
          </Text>
        </Box>

        <Button
          asChild
          bg="var(--mg-button)"
          color="white"
          borderRadius="10px"
          px={5}
          minH="44px"
          fontWeight="600"
          _hover={{
            bg: "var(--mg-button-hover)",
          }}
        >
          <RouterLink to="/acc/auth/users/create">
            + Create Account
          </RouterLink>
        </Button>
      </Flex>

      {/* ========================================== */}
      {/* SEARCH AND FILTER */}
      {/* ========================================== */}

      <Flex
        gap={3}
        flexWrap="wrap"
        align="center"
        p={4}
        {...cardStyles}
      >
        <Box
          as="form"
          onSubmit={handleSearch}
          display="flex"
          gap={2}
          flex="1"
          minW={{ base: "100%", md: "260px" }}
        >
          <Input
            placeholder="Search name, email, student ID..."
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            maxLength={100}
            minH="42px"
            {...inputStyles}
          />

          <Button
            type="submit"
            minH="42px"
            px={5}
            bg="var(--mg-surface-alt)"
            color="var(--mg-accent)"
            border="1px solid var(--mg-border)"
            _hover={{
              bg: "var(--mg-bg)",
            }}
          >
            Search
          </Button>
        </Box>

        <Box w={{ base: "100%", md: "200px" }}>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
              minH="42px"
              {...inputStyles}
            >
              <option value="">All Roles</option>
              <option value="super_admin">
                Super Admin
              </option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </NativeSelect.Field>

            <NativeSelect.Indicator
              color="var(--mg-muted)"
            />
          </NativeSelect.Root>
        </Box>
      </Flex>

      {/* ========================================== */}
      {/* MESSAGES */}
      {/* ========================================== */}

      {error && (
        <Box
          p={4}
          bg="#FFF5F5"
          border="1px solid #F3C7CC"
          borderRadius="12px"
        >
          <Text color="#B83245" fontSize="sm">
            {error}
          </Text>
        </Box>
      )}

      {success && (
        <Box
          p={4}
          bg="#E4F6ED"
          border="1px solid #BCE5D0"
          borderRadius="12px"
        >
          <Text color="#13784F" fontSize="sm">
            {success}
          </Text>
        </Box>
      )}

      {/* ========================================== */}
      {/* USERS TABLE */}
      {/* ========================================== */}

      <Box
        {...cardStyles}
        overflow="hidden"
      >
        <Box overflowX="auto" w="100%">
          <Table.Root
            size="sm"
            minW="950px"
            bg="var(--mg-surface)"
            color="var(--mg-text)"
          >
            <Table.Header>
              <Table.Row
                bg="var(--mg-surface-alt)"
              >
                {[
                  "NAME",
                  "EMAIL",
                  "STUDENT ID",
                  "ROLE",
                  "STATUS",
                  "ACTIONS",
                ].map((column) => (
                  <Table.ColumnHeader
                    key={column}
                    px={5}
                    py={4}
                    bg="var(--mg-surface-alt)"
                    color="var(--mg-muted)"
                    borderColor="var(--mg-border)"
                    fontSize="11px"
                    fontWeight="750"
                  >
                    {column}
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {loading ? (
                <Table.Row
                  bg="var(--mg-surface)"
                >
                  <Table.Cell
                    colSpan={6}
                    textAlign="center"
                    py={10}
                    bg="var(--mg-surface)"
                    borderColor="var(--mg-border)"
                  >
                    <Spinner
                      size="sm"
                      color="var(--mg-accent)"
                    />
                  </Table.Cell>
                </Table.Row>
              ) : users.length === 0 ? (
                <Table.Row
                  bg="var(--mg-surface)"
                >
                  <Table.Cell
                    colSpan={6}
                    textAlign="center"
                    py={12}
                    bg="var(--mg-surface)"
                    color="var(--mg-muted)"
                    borderColor="var(--mg-border)"
                  >
                    No users found.
                  </Table.Cell>
                </Table.Row>
              ) : (
                users.map((user) => (
                  <Table.Row
                    key={user._id}
                    bg="var(--mg-surface)"
                    color="var(--mg-text)"
                    _hover={{
                      bg: "var(--mg-surface-alt)",
                    }}
                  >
                    <Table.Cell
                      px={5}
                      py={4}
                      borderColor="var(--mg-border)"
                    >
                      <Text
                        fontWeight="650"
                        color="var(--mg-text)"
                      >
                        {user.firstName}{" "}
                        {user.lastName}
                      </Text>
                    </Table.Cell>

                    <Table.Cell
                      px={5}
                      py={4}
                      borderColor="var(--mg-border)"
                    >
                      <Text
                        color="var(--mg-muted)"
                        overflowWrap="anywhere"
                      >
                        {user.email}
                      </Text>
                    </Table.Cell>

                    <Table.Cell
                      px={5}
                      py={4}
                      borderColor="var(--mg-border)"
                    >
                      <Text
                        color="var(--mg-accent)"
                      >
                        {user.studentId ?? "—"}
                      </Text>
                    </Table.Cell>

                    <Table.Cell
                      px={5}
                      py={4}
                      borderColor="var(--mg-border)"
                    >
                      <Badge
                        bg="var(--mg-surface-alt)"
                        color="var(--mg-accent)"
                        borderRadius="full"
                        px={2}
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    </Table.Cell>

                    <Table.Cell
                      px={5}
                      py={4}
                      borderColor="var(--mg-border)"
                    >
                      <Badge
                        bg={
                          user.isActive
                            ? "#E4F6ED"
                            : "#FFEBED"
                        }
                        color={
                          user.isActive
                            ? "#13784F"
                            : "#B83245"
                        }
                        borderRadius="full"
                        px={2}
                      >
                        {user.isActive
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </Table.Cell>

                    <Table.Cell
                      px={5}
                      py={4}
                      borderColor="var(--mg-border)"
                    >
                      <HStack gap={2}>
                        <Button
                          size="xs"
                          bg="var(--mg-surface-alt)"
                          color="var(--mg-accent)"
                          _hover={{
                            bg: "var(--mg-bg)",
                          }}
                          onClick={() =>
                            openEdit(user)
                          }
                        >
                          Edit
                        </Button>

                        <Button
                          size="xs"
                          variant="outline"
                          {...outlineButtonStyles}
                          disabled
                          title="Account lifecycle service is not ready."
                        >
                          {user.isActive
                            ? "Deactivate"
                            : "Reactivate"}
                        </Button>

                        {isSuperAdmin && (
                          <Button
                            size="xs"
                            colorPalette="red"
                            variant="outline"
                            disabled
                            title="Permanent deletion is blocked until academic dependency checks are implemented."
                          >
                            Delete
                          </Button>
                        )}
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

      {/* ========================================== */}
      {/* PAGINATION */}
      {/* ========================================== */}

      <Flex
        justify="space-between"
        align="center"
        flexWrap="wrap"
        gap={3}
        p={4}
        {...cardStyles}
      >
        <Text
          fontSize="sm"
          color="var(--mg-muted)"
        >
          Total:{" "}
          <Text
            as="span"
            fontWeight="700"
            color="var(--mg-text)"
          >
            {pagination?.total ?? 0}
          </Text>{" "}
          users
        </Text>

        <HStack gap={3}>
          <Button
            size="sm"
            variant="outline"
            {...outlineButtonStyles}
            disabled={page <= 1 || loading}
            onClick={() =>
              setPage((value) => value - 1)
            }
          >
            Previous
          </Button>

          <Text
            fontSize="sm"
            fontWeight="650"
            color="var(--mg-text)"
          >
            Page {page} /{" "}
            {Math.max(
              1,
              pagination?.totalPages ?? 1
            )}
          </Text>

          <Button
            size="sm"
            variant="outline"
            {...outlineButtonStyles}
            disabled={
              loading ||
              page >=
                (pagination?.totalPages ?? 1)
            }
            onClick={() =>
              setPage((value) => value + 1)
            }
          >
            Next
          </Button>
        </HStack>
      </Flex>

      {/* ========================================== */}
      {/* EDIT USER FORM */}
      {/* ========================================== */}

      {editingUser && (
        <Box
          p={5}
          {...cardStyles}
        >
          <Heading
            size="md"
            color="var(--mg-text)"
            mb={4}
          >
            Edit User
          </Heading>

          <Box
            as="form"
            onSubmit={saveUser}
          >
            <VStack align="stretch" gap={4}>
              <Box>
                <Text
                  mb={2}
                  fontWeight="600"
                  color="var(--mg-text)"
                >
                  First Name
                </Text>

                <Input
                  value={editForm.firstName}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      firstName:
                        event.target.value,
                    }))
                  }
                  required
                  maxLength={100}
                  {...inputStyles}
                />
              </Box>

              <Box>
                <Text
                  mb={2}
                  fontWeight="600"
                  color="var(--mg-text)"
                >
                  Last Name
                </Text>

                <Input
                  value={editForm.lastName}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      lastName:
                        event.target.value,
                    }))
                  }
                  required
                  maxLength={100}
                  {...inputStyles}
                />
              </Box>

              <Box>
                <Text
                  mb={2}
                  fontWeight="600"
                  color="var(--mg-text)"
                >
                  Email
                </Text>

                <Input
                  value={editingUser.email}
                  readOnly
                  bg="var(--mg-bg)"
                  color="var(--mg-muted)"
                  borderColor="var(--mg-border)"
                />

                <Text
                  mt={1}
                  fontSize="xs"
                  color="var(--mg-muted)"
                >
                  Email changes require a separate
                  verified identity update flow.
                </Text>
              </Box>

              <HStack gap={3}>
                <Button
                  type="button"
                  variant="outline"
                  {...outlineButtonStyles}
                  disabled={saving}
                  onClick={() =>
                    setEditingUser(null)
                  }
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  bg="var(--mg-button)"
                  color="white"
                  loading={saving}
                  _hover={{
                    bg: "var(--mg-button-hover)",
                  }}
                >
                  Save Changes
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}

      {/* ========================================== */}
      {/* LIFECYCLE NOTICE */}
      {/* ========================================== */}

      <Box
        p={4}
        bg="var(--mg-surface-alt)"
        color="var(--mg-text)"
        border="1px solid var(--mg-border)"
        borderRadius="12px"
      >
        <Text
          fontSize="sm"
          color="var(--mg-muted)"
        >
          Account deactivation, reactivation,
          and permanent deletion will become
          available after Clerk session handling
          and academic dependency checks are
          completed.
        </Text>
      </Box>
    </VStack>
  );
}
