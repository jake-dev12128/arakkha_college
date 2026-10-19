
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
  // LOAD USERS
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
  // SEARCH
  // ==================================================

  const handleSearch = (event) => {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  };

  // ==================================================
  // OPEN EDIT FORM
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
  // SAVE USER
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
  // RENDER
  // ==================================================

  return (
    <VStack
      align="stretch"
      gap={5}
      w="100%"
      minW="0"
      color="#202B45"
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
              color="#192968"
              fontWeight="750"
              letterSpacing="-0.03em"
            >
              User Management
            </Heading>
          </HStack>

          <Text color="#74809A" fontSize="sm">
            Manage ACC staff and student accounts.
          </Text>
        </Box>

        <Button
          asChild
          bg="#253783"
          color="white"
          borderRadius="10px"
          px={5}
          minH="44px"
          fontWeight="600"
          _hover={{ bg: "#30458F" }}
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
        bg="white"
        border="1px solid #E1E6F0"
        borderRadius="14px"
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
            bg="white"
            borderColor="#E1E6F0"
            borderRadius="10px"
          />

          <Button
            type="submit"
            minH="42px"
            px={5}
            bg="#EDF0FC"
            color="#253783"
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
              bg="white"
              borderColor="#E1E6F0"
            >
              <option value="">All Roles</option>
              <option value="super_admin">
                Super Admin
              </option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </NativeSelect.Field>

            <NativeSelect.Indicator />
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
        bg="white"
        border="1px solid #E1E6F0"
        borderRadius="14px"
        overflow="hidden"
      >
        <Box overflowX="auto" w="100%">
          <Table.Root size="sm" minW="950px">
            <Table.Header>
              <Table.Row bg="#F3F5FC">
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
                    color="#526080"
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
                <Table.Row>
                  <Table.Cell
                    colSpan={6}
                    textAlign="center"
                    py={10}
                  >
                    <Spinner
                      size="sm"
                      color="#4359B5"
                    />
                  </Table.Cell>
                </Table.Row>
              ) : users.length === 0 ? (
                <Table.Row>
                  <Table.Cell
                    colSpan={6}
                    textAlign="center"
                    py={12}
                  >
                    No users found.
                  </Table.Cell>
                </Table.Row>
              ) : (
                users.map((user) => (
                  <Table.Row
                    key={user._id}
                    _hover={{ bg: "#F8F9FF" }}
                  >
                    <Table.Cell px={5} py={4}>
                      <Text
                        fontWeight="650"
                        color="#192968"
                      >
                        {user.firstName}{" "}
                        {user.lastName}
                      </Text>
                    </Table.Cell>

                    <Table.Cell px={5} py={4}>
                      <Text
                        color="#66728D"
                        overflowWrap="anywhere"
                      >
                        {user.email}
                      </Text>
                    </Table.Cell>

                    <Table.Cell px={5} py={4}>
                      <Text color="#4359B5">
                        {user.studentId ?? "—"}
                      </Text>
                    </Table.Cell>

                    <Table.Cell px={5} py={4}>
                      <Badge
                        bg="#EDF0FC"
                        color="#30458F"
                        borderRadius="full"
                        px={2}
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    </Table.Cell>

                    <Table.Cell px={5} py={4}>
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

                    <Table.Cell px={5} py={4}>
                      <HStack gap={2}>
                        <Button
                          size="xs"
                          bg="#EDF0FC"
                          color="#253783"
                          onClick={() =>
                            openEdit(user)
                          }
                        >
                          Edit
                        </Button>

                        <Button
                          size="xs"
                          variant="outline"
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
        bg="white"
        border="1px solid #E1E6F0"
        borderRadius="12px"
      >
        <Text fontSize="sm" color="#74809A">
          Total:{" "}
          <Text
            as="span"
            fontWeight="700"
            color="#192968"
          >
            {pagination?.total ?? 0}
          </Text>{" "}
          users
        </Text>

        <HStack gap={3}>
          <Button
            size="sm"
            variant="outline"
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
            color="#192968"
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
          bg="white"
          border="1px solid #E1E6F0"
          borderRadius="14px"
        >
          <Heading
            size="md"
            color="#192968"
            mb={4}
          >
            Edit User
          </Heading>

          <Box as="form" onSubmit={saveUser}>
            <VStack align="stretch" gap={4}>
              <Box>
                <Text mb={2} fontWeight="600">
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
                />
              </Box>

              <Box>
                <Text mb={2} fontWeight="600">
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
                />
              </Box>

              <Box>
                <Text mb={2} fontWeight="600">
                  Email
                </Text>

                <Input
                  value={editingUser.email}
                  readOnly
                  bg="#F3F5FC"
                />

                <Text
                  mt={1}
                  fontSize="xs"
                  color="#74809A"
                >
                  Email changes require a separate
                  verified identity update flow.
                </Text>
              </Box>

              <HStack gap={3}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() =>
                    setEditingUser(null)
                  }
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  bg="#253783"
                  color="white"
                  loading={saving}
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
        bg="#F8F9FF"
        border="1px solid #E1E6F0"
        borderRadius="12px"
      >
        <Text
          fontSize="sm"
          color="#66728D"
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
