import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Table,
  Text,
  VStack,
  Badge,
  Separator,
  SimpleGrid,
} from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { dashboardService } from "../../services/dashboard.service.js";

const fields = [
  ["firstName", "First Name"],
  ["lastName", "Last Name"],
  ["email", "Email"],
  ["studentId", "Student ID"],
  ["address", "Permanent Address"],
  ["currentAddress", "Current Address"],
  ["age", "Age"],
  ["fatherName", "Father Name"],
  ["motherName", "Mother Name"],
  ["nationalId", "NRC Number"],
  ["dateOfBirth", "Date of Birth"],
  ["gender", "Gender"],
];

export default function ProfileDetails({ role }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const resource = role === "student" ? "students" : "teachers";

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await dashboardService.getProfileByUserId(
          role,
          id,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err?.response?.data?.message ||
              "Unable to load profile.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [id, role]);

  if (loading) {
    return (
      <Box
        bg="white"
        border="1px solid"
        borderColor="#E1E6F0"
        borderRadius="xl"
        p={8}
        textAlign="center"
      >
        <Text
          color="#253783"
          fontSize="sm"
          fontWeight="semibold"
        >
          Loading profile...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        bg="white"
        border="1px solid"
        borderColor="#E1E6F0"
        borderRadius="xl"
        p={6}
      >
        <Heading size="md" color="red.600" mb={2}>
          Unable to Load Profile
        </Heading>

        <Text color="gray.600" fontSize="sm">
          {error}
        </Text>

        <Button
          mt={4}
          size="sm"
          variant="outline"
          borderColor="#253783"
          color="#253783"
          onClick={() => navigate(`/acc/auth/${resource}`)}
        >
          Back to {resource}
        </Button>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        bg="white"
        border="1px solid"
        borderColor="#E1E6F0"
        borderRadius="xl"
        p={8}
        textAlign="center"
      >
        <Heading size="md" color="#192968" mb={2}>
          Profile Not Found
        </Heading>

        <Text color="gray.500" fontSize="sm" mb={4}>
          The requested profile could not be found.
        </Text>

        <Button
          size="sm"
          bg="#253783"
          color="white"
          _hover={{ bg: "#192968" }}
          onClick={() => navigate(`/acc/auth/${resource}`)}
        >
          Back to {resource}
        </Button>
      </Box>
    );
  }

  const { user, profile } = data;

  const values = {
    ...profile,
    ...user,
    dateOfBirth: profile.dateOfBirth
      ? new Date(profile.dateOfBirth).toLocaleDateString()
      : "—",
  };

  const fullName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    "Unnamed User";

  return (
    <VStack align="stretch" gap={5} pb={8}>
      {/* Page Header */}
      <Flex
        align="center"
        justify="space-between"
        gap={3}
        flexWrap="wrap"
      >
        <Box>
          <Heading size="lg" color="#192968">
            Profile Details
          </Heading>

          <Text fontSize="sm" color="gray.500" mt={1}>
            View and manage {role} information
          </Text>
        </Box>

        <Button
          size="sm"
          variant="outline"
          borderColor="#D5DCEE"
          color="#253783"
          borderRadius="lg"
          onClick={() => navigate(`/acc/auth/${resource}`)}
        >
          Back to {resource}
        </Button>
      </Flex>

      {/* Main Layout */}
      <SimpleGrid
        columns={{ base: 1, lg: 3 }}
        gap={5}
        alignItems="stretch"
      >
        {/* Left Profile Card */}
        <Box
          bg="white"
          border="1px solid"
          borderColor="#E1E6F0"
          borderRadius="xl"
          overflow="hidden"
          h="100%"
          boxShadow="0 4px 16px rgba(25,41,104,0.05)"
        >
          {/* Profile Header */}
          <Flex
            align="center"
            justify="space-between"
            px={5}
            py={4}
            gap={2}
          >
            <Heading size="md" color="#192968">
              Profile
            </Heading>

            <Button
              size="sm"
              bg="#253783"
              color="white"
              borderRadius="lg"
              _hover={{ bg: "#192968" }}
              onClick={() =>
                navigate(`/acc/auth/${resource}/${id}/edit`)
              }
            >
              Edit Profile
            </Button>
          </Flex>

          <Separator borderColor="#E8ECF5" />

          {/* Profile Identity */}
          <VStack px={5} py={6} gap={3}>
            <Box
              w="88px"
              h="88px"
              flexShrink={0}
              borderRadius="full"
              border="3px solid"
              borderColor="#E1E6F0"
              bg="#EEF1FC"
              color="#253783"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="2xl"
              fontWeight="bold"
            >
              {(
                `${user.firstName?.[0] ?? ""}${
                  user.lastName?.[0] ?? ""
                }`.toUpperCase() || "A"
              )}
            </Box>

            <Box textAlign="center" w="full">
              <Heading size="md" color="#192968">
                {fullName}
              </Heading>

              <Text
                fontSize="sm"
                color="gray.500"
                mt={1}
                overflowWrap="anywhere"
              >
                {user.email ?? "No email available"}
              </Text>
            </Box>

            <Badge
              px={3}
              py={1}
              borderRadius="full"
              bg={user.isActive ? "#DCFCE7" : "#FEE2E2"}
              color={user.isActive ? "#166534" : "#991B1B"}
            >
              {user.isActive ? "Active Account" : "Inactive Account"}
            </Badge>
          </VStack>

          <Separator borderColor="#E8ECF5" />

          {/* Overview */}
          <Box p={5}>
            <Heading size="sm" color="#192968" mb={4}>
              Overview
            </Heading>

            <VStack align="stretch" gap={4}>
              <Flex
                justify="space-between"
                align="center"
                gap={3}
              >
                <Text fontSize="sm" color="gray.500">
                  Role Type
                </Text>

                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color="#253783"
                  textTransform="capitalize"
                >
                  {role}
                </Text>
              </Flex>

              {role === "student" && (
                <Flex
                  justify="space-between"
                  align="center"
                  gap={3}
                >
                  <Text fontSize="sm" color="gray.500">
                    Student ID
                  </Text>

                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color="#253783"
                    overflowWrap="anywhere"
                  >
                    {profile.studentId ?? "—"}
                  </Text>
                </Flex>
              )}

              <Flex
                justify="space-between"
                align="center"
                gap={3}
              >
                <Text fontSize="sm" color="gray.500">
                  Account Status
                </Text>

                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={user.isActive ? "#166534" : "#991B1B"}
                >
                  {user.isActive ? "Active" : "Inactive"}
                </Text>
              </Flex>
            </VStack>
          </Box>
        </Box>

        {/* Right Content */}
        <VStack
          align="stretch"
          gap={5}
          gridColumn={{ base: "auto", lg: "span 2" }}
          minW={0}
          h="100%"
        >
          {/* Personal Information */}
          <Box
            bg="white"
            border="1px solid"
            borderColor="#E1E6F0"
            borderRadius="xl"
            overflow="hidden"
            boxShadow="0 4px 16px rgba(25,41,104,0.04)"
          >
            <Box px={5} py={4}>
              <Heading size="md" color="#192968">
                Personal Information
              </Heading>

              <Text fontSize="sm" color="gray.500" mt={1}>
                Personal details and records
              </Text>
            </Box>

            <Separator borderColor="#E8ECF5" />

            <SimpleGrid
              columns={{ base: 1, md: 2 }}
              gap={0}
              p={3}
            >
              {fields
                .filter(
                  ([key]) =>
                    key !== "studentId" || role === "student",
                )
                .map(([key, label]) => (
                  <Box
                    key={key}
                    px={3}
                    py={3}
                    borderBottom="1px solid"
                    borderColor="#EDF0F7"
                    minW={0}
                  >
                    <Text
                      color="gray.500"
                      fontSize="xs"
                      fontWeight="medium"
                      mb={1}
                    >
                      {label}
                    </Text>

                    <Text
                      color="#253783"
                      fontSize="sm"
                      fontWeight="medium"
                      overflowWrap="anywhere"
                    >
                      {String(values[key] ?? "—")}
                    </Text>
                  </Box>
                ))}
            </SimpleGrid>
          </Box>

          {/* Matriculation Scores */}
          {role === "student" && (
            <Box
              bg="white"
              border="1px solid"
              borderColor="#E1E6F0"
              borderRadius="xl"
              overflow="hidden"
              boxShadow="0 4px 16px rgba(25,41,104,0.04)"
            >
              <Box px={5} py={4}>
                <Heading size="md" color="#192968">
                  Matriculation Scores
                </Heading>

                <Text fontSize="sm" color="gray.500" mt={1}>
                  Academic subject evaluations
                </Text>
              </Box>

              <Separator borderColor="#E8ECF5" />

              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row bg="#F5F7FC">
                      <Table.ColumnHeader
                        color="#253783"
                        px={5}
                        py={3}
                      >
                        Subject
                      </Table.ColumnHeader>

                      <Table.ColumnHeader
                        color="#253783"
                        px={5}
                        py={3}
                      >
                        Score
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>

                  <Table.Body>
                    {(profile.matriculationScores ?? []).map(
                      (score, index) => (
                        <Table.Row
                          key={`${score.subject}-${index}`}
                          _hover={{ bg: "#F8F9FE" }}
                        >
                          <Table.Cell px={5} py={3}>
                            {score.subject}
                          </Table.Cell>

                          <Table.Cell px={5} py={3}>
                            {score.score}
                          </Table.Cell>
                        </Table.Row>
                      ),
                    )}
                  </Table.Body>
                </Table.Root>
              </Box>

              {(profile.matriculationScores ?? []).length === 0 && (
                <Text
                  px={5}
                  py={6}
                  color="gray.500"
                  fontSize="sm"
                  textAlign="center"
                >
                  No matriculation scores available.
                </Text>
              )}
            </Box>
          )}
        </VStack>
      </SimpleGrid>
    </VStack>
  );
}
