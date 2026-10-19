
import { useEffect, useState } from "react";

import {
  Alert,
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  Image,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";

import {
  LuMonitor,
  LuLogOut,
} from "react-icons/lu";

import api from "../../api/api.js";
import useAuthStore from "../../store/authStore.js";

function Dashboard() {
  const navigate = useNavigate();

  const { signOut, isLoaded, isSignedIn } =
    useAuth();

  const clearLoginAttempt = useAuthStore(
    (state) => state.clearLoginAttempt,
  );

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  // ================================================
  // LOAD ACCOUNT DATA
  // ================================================

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          "/auth/me",
          {
            signal: controller.signal,
          },
        );

        if (controller.signal.aborted) return;

        const currentUser =
          response.data?.data?.user ??
          response.data?.user;

        if (!currentUser) {
          throw new Error(
            "User data not found.",
          );
        }

        setUser(currentUser);
        clearLoginAttempt();
      } catch (err) {
        if (
          controller.signal.aborted ||
          err?.code === "ERR_CANCELED"
        ) {
          return;
        }

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load account overview.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => controller.abort();
  }, [
    isLoaded,
    isSignedIn,
    clearLoginAttempt,
  ]);

  // ================================================
  // LOGOUT
  // ================================================

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await api.post("/auth/logout");

      await signOut();

      clearLoginAttempt();

      navigate("/acc/auth/login", {
        replace: true,
      });
    } catch (err) {
      setLogoutError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to log out.",
      );
    } finally {
      setLoggingOut(false);
    }
  };

  // ================================================
  // LOADING
  // ================================================

  if (!isLoaded || loading) {
    return (
      <Flex
        minH="60vh"
        align="center"
        justify="center"
      >
        <VStack gap={4}>
          <Image
            src="/acc_logo.png"
            alt="ACC Computer College"
            boxSize="90px"
            objectFit="contain"
          />

          <Text
            fontSize="sm"
            color="gray.500"
          >
            Loading account overview...
          </Text>
        </VStack>
      </Flex>
    );
  }

  // ================================================
  // ERROR
  // ================================================

  if (error || !user) {
    return (
      <Box maxW="700px" mx="auto" py={8}>
        <Alert.Root
          status="error"
          borderRadius="12px"
        >
          <Alert.Indicator />

          <Alert.Content>
            <Alert.Description>
              {error || "Account not available."}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      </Box>
    );
  }

  // ================================================
  // ACCOUNT OVERVIEW
  // ================================================

  return (
    <Box
      width="100%"
      maxW="1100px"
      mx="auto"
      px={{ base: 4, md: 6 }}
      py={{ base: 6, md: 8 }}
    >
   
      {/* ==========================================
          ERRORS
      ========================================== */}

      {logoutError && (
        <Alert.Root
          status="error"
          mb={5}
          borderRadius="12px"
        >
          <Alert.Indicator />

          <Alert.Content>
            <Alert.Description>
              {logoutError}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {/* ==========================================
          PROFILE CARD
      ========================================== */}

      <Card.Root
        bg="white"
        border="1px solid"
        borderColor="gray.100"
        borderRadius="20px"
        boxShadow="0 8px 30px rgba(0,0,0,0.05)"
        maxW="760px"
        mx="auto"
        overflow="hidden"
      >
        <Card.Header px={6} pt={6}>
          <Text
            fontSize="xs"
            color="blue.600"
            fontWeight="700"
            mb={1}
          >
            MY ACCOUNT
          </Text>

          <Heading
            size="md"
            color="gray.800"
          >
            Profile Information
          </Heading>
        </Card.Header>

        <Card.Body px={6} pb={6}>
          <VStack align="stretch" gap={0}>
            <ProfileField
              label="Full Name"
              value={[
                user.firstName,
                user.lastName,
              ]
                .filter(Boolean)
                .join(" ")}
            />

            <Separator />

            <ProfileField
              label="Email Address"
              value={
                user.email || "Not provided"
              }
            />

            {user.role === "student" &&
              user.studentId && (
                <>
                  <Separator />

                  <ProfileField
                    label="Student ID"
                    value={user.studentId}
                  />
                </>
              )}

            <Separator />

            <Box py={4}>
              <Text
                fontSize="xs"
                color="gray.500"
                mb={2}
              >
                Account Role
              </Text>

              <Badge
                colorPalette="blue"
                variant="subtle"
                borderRadius="full"
                px={3}
                py={1}
                textTransform="capitalize"
              >
                {user.role?.replaceAll(
                  "_",
                  " ",
                ) || "Unknown"}
              </Badge>
            </Box>

            <Separator />

            <Box py={4}>
              <Text
                fontSize="xs"
                color="gray.500"
                mb={2}
              >
                Account Status
              </Text>

              <Badge
                colorPalette={
                  user.isActive
                    ? "green"
                    : "red"
                }
                variant="subtle"
                borderRadius="full"
                px={3}
                py={1}
              >
                {user.isActive
                  ? "Active"
                  : "Inactive"}
              </Badge>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>

    </Box>
  );
}

// ================================================
// REUSABLE PROFILE FIELD
// ================================================

function ProfileField({
  label,
  value,
}) {
  return (
    <Box py={4}>
      <Text
        fontSize="xs"
        color="gray.500"
        mb={1}
      >
        {label}
      </Text>

      <Text
        fontWeight="600"
        color="gray.800"
        wordBreak="break-word"
      >
        {value || "Not provided"}
      </Text>
    </Box>
  );
}

export default Dashboard;
