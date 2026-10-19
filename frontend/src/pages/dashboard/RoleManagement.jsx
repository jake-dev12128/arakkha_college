
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

import {
  Link as RouterLink,
  useNavigate,
} from "react-router-dom";

import { dashboardService } from "../../services/dashboard.service.js";

const PAGE_SIZE = 10;

export default function RoleManagement({ role }) {
  const navigate = useNavigate();

  const resource =
    role === "student" ? "students" : "teachers";

  const singular =
    role === "student" ? "Student" : "Teacher";

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfiles() {
      setLoading(true);
      setError("");

      try {
        const result = await dashboardService.getProfiles(
          role,
          {
            page,
            limit: PAGE_SIZE,
            status,
            ...(search ? { search } : {}),
          },
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setUsers(result.users ?? []);
        setPagination(
          result.pagination ?? {
            total: 0,
            totalPages: 0,
          },
        );
      } catch (err) {
        if (controller.signal.aborted) return;

        setUsers([]);
        setError(
          err?.response?.data?.message ||
            `Unable to load ${resource}.`,
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProfiles();

    return () => controller.abort();
  }, [role, page, search, status, reloadKey, resource]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const deactivate = async () => {
    if (!selectedUser) return;

    setDeactivating(true);
    setError("");

    try {
      const result =
        await dashboardService.getProfileByUserId(
          role,
          selectedUser._id,
        );

      await dashboardService.deactivateProfile(
        role,
        result.profile._id,
      );

      setSelectedUser(null);
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to deactivate account.",
      );
    } finally {
      setDeactivating(false);
    }
  };

  const openProfile = (user, mode) => {
    navigate(
      `/acc/auth/${resource}/${user._id}` +
        (mode === "edit" ? "/edit" : ""),
    );
  };

  return (
    <VStack
      className="acc-role-management"
      align="stretch"
      gap={5}
    >
      {/* Page heading */}
      <Flex
        justify="space-between"
        align="center"
        flexWrap="wrap"
        gap={4}
      >
        <Box className="acc-page-heading">
          <HStack gap={2} mb={2}>
            <Box
              w="4px"
              h="26px"
              bg="#F2A23A"
              borderRadius="full"
            />

            <Heading
              className="acc-page-title"
              size="2xl"
            >
              {singular} Management
            </Heading>
          </HStack>

          <Text className="acc-page-description">
            Manage ACC {resource}, review account status,
            and update profile information.
          </Text>
        </Box>

        <Button
          asChild
          className="acc-add-button"
          px={5}
          minH="44px"
        >
          <RouterLink to={`/acc/auth/${resource}/create`}>
            + Add {singular}
          </RouterLink>
        </Button>
      </Flex>

      {/* Search and filters */}
      <Flex
        className="acc-toolbar"
        gap={3}
        flexWrap="wrap"
        align="center"
      >
        <Box
          as="form"
          className="acc-search-form"
          onSubmit={handleSearch}
          display="flex"
          flex="1"
          gap={2}
        >
          <Input
            className="acc-search-input"
            value={searchInput}
            placeholder="Search name, email, ID..."
            maxLength={100}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
          />

          <Button
            className="acc-search-button"
            type="submit"
            minH="42px"
          >
            Search
          </Button>
        </Box>

        <Box minW={{ base: "100%", md: "175px" }}>
          <NativeSelect.Root className="acc-status-select">
            <NativeSelect.Field
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </NativeSelect.Field>

            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
      </Flex>

      {/* Error message */}
      {error && (
        <Box className="acc-error-panel">
          <Text className="acc-error-message">
            {error}
          </Text>

          <Button
            size="sm"
            mt={3}
            variant="outline"
            onClick={() =>
              setReloadKey((value) => value + 1)
            }
          >
            Retry
          </Button>
        </Box>
      )}

      {/* Profiles table */}
      <Box className="acc-table-card">
        <Box className="acc-table-scroll">
          <Table.Root
            className="acc-management-table"
            size="sm"
          >
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>
                  Name
                </Table.ColumnHeader>

                <Table.ColumnHeader>
                  Email
                </Table.ColumnHeader>

                {role === "student" && (
                  <Table.ColumnHeader>
                    Student ID
                  </Table.ColumnHeader>
                )}

                <Table.ColumnHeader>
                  Status
                </Table.ColumnHeader>

                <Table.ColumnHeader>
                  Actions
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {loading ? (
                <Table.Row>
                  <Table.Cell
                    className="acc-loading-cell"
                    colSpan={role === "student" ? 5 : 4}
                  >
                    <VStack gap={3}>
                      <Spinner
                        size="md"
                        color="#4359B5"
                      />

                      <Text
                        color="fg.muted"
                        fontSize="sm"
                      >
                        Loading {resource}...
                      </Text>
                    </VStack>
                  </Table.Cell>
                </Table.Row>
              ) : users.length === 0 ? (
                <Table.Row>
                  <Table.Cell
                    className="acc-empty-cell"
                    colSpan={role === "student" ? 5 : 4}
                  >
                    <VStack gap={2} py={4}>
                      <Text
                        fontSize="lg"
                        fontWeight="semibold"
                        color="#192968"
                      >
                        No {resource} found
                      </Text>

                      <Text
                        fontSize="sm"
                        color="fg.muted"
                      >
                        Try another search term or change
                        the status filter.
                      </Text>
                    </VStack>
                  </Table.Cell>
                </Table.Row>
              ) : (
                users.map((user) => (
                  <Table.Row key={user._id}>
                    <Table.Cell>
                      <Text className="acc-person-name">
                        {user.firstName} {user.lastName}
                      </Text>
                    </Table.Cell>

                    <Table.Cell>
                      <Text className="acc-person-email">
                        {user.email}
                      </Text>
                    </Table.Cell>

                    {role === "student" && (
                      <Table.Cell>
                        <Text
                          fontWeight="semibold"
                          color="#4359B5"
                        >
                          {user.studentId ?? "—"}
                        </Text>
                      </Table.Cell>
                    )}

                    <Table.Cell>
                      <Badge
                        className={`acc-status-badge ${
                          user.isActive
                            ? "acc-status-badge--active"
                            : "acc-status-badge--inactive"
                        }`}
                      >
                        {user.isActive
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </Table.Cell>

                    <Table.Cell>
                      <HStack className="acc-row-actions">
                        <Button
                          className="acc-action-button acc-action-view"
                          size="xs"
                          onClick={() =>
                            openProfile(user, "view")
                          }
                        >
                          View
                        </Button>

                        <Button
                          className="acc-action-button acc-action-edit"
                          size="xs"
                          onClick={() =>
                            openProfile(user, "edit")
                          }
                        >
                          Edit
                        </Button>

                        <Button
                          className="acc-action-button acc-action-deactivate"
                          size="xs"
                          disabled={!user.isActive}
                          onClick={() =>
                            setSelectedUser(user)
                          }
                        >
                          Deactivate
                        </Button>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

      {/* Pagination */}
      <Flex
        className="acc-pagination"
        justify="space-between"
        align="center"
        gap={3}
        flexWrap="wrap"
      >
        <Text className="acc-total-count">
          Total:{" "}
          <Text
            as="span"
            fontWeight="700"
            color="#192968"
          >
            {pagination.total ?? 0}
          </Text>{" "}
          {resource}
        </Text>

        <HStack
          className="acc-pagination-controls"
          gap={3}
        >
          <Button
            className="acc-pagination-button"
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() =>
              setPage((value) => value - 1)
            }
          >
            Previous
          </Button>

          <Text className="acc-page-indicator">
            Page {page} of{" "}
            {Math.max(1, pagination.totalPages ?? 1)}
          </Text>

          <Button
            className="acc-pagination-button"
            size="sm"
            variant="outline"
            disabled={
              loading ||
              page >= (pagination.totalPages ?? 1)
            }
            onClick={() =>
              setPage((value) => value + 1)
            }
          >
            Next
          </Button>
        </HStack>
      </Flex>

      {/* Deactivation confirmation */}
      {selectedUser && (
        <Box className="acc-confirm-panel">
          <Heading
            className="acc-confirm-title"
            size="md"
            mb={3}
          >
            Confirm Deactivation
          </Heading>

          <Text className="acc-confirm-description" mb={5}>
            Are you sure you want to deactivate{" "}
            <Text
              as="span"
              fontWeight="700"
              color="#192968"
            >
              {selectedUser.firstName}{" "}
              {selectedUser.lastName}
            </Text>
            ? This account will no longer be permitted
            to access protected APIs.
          </Text>

          <HStack gap={3} flexWrap="wrap">
            <Button
              className="acc-confirm-cancel"
              variant="outline"
              disabled={deactivating}
              onClick={() => setSelectedUser(null)}
            >
              Cancel
            </Button>

            <Button
              className="acc-confirm-button"
              loading={deactivating}
              onClick={deactivate}
            >
              Confirm Deactivate
            </Button>
          </HStack>
        </Box>
      )}
    </VStack>
  );
}
