
import { useEffect, useState } from "react";

import {
  Navigate,
  Outlet,
  Link as RouterLink,
  useLocation,
} from "react-router-dom";

import { useAuth } from "@clerk/react";

import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  FiAlertCircle,
  FiArrowLeft,
  FiHome,
  FiShield,
} from "react-icons/fi";

import api from "../../api/api.js";

import {
  buildCourseLoginUrl,
} from "../../utils/courseReturnUrl.js";

const ALLOWED_ROLES = new Set([
  "super_admin",
  "admin",
  "teacher",
  "student",
]);

function AccessStatus({
  title,
  description,
  icon: StatusIcon = FiShield,
}) {
  return (
    <Box
      bg="var(--public-bg)"
      color="var(--public-text)"
      minH="60vh"
      py={{ base: 12, md: 20 }}
    >
      <Container maxW="760px">
        <Box
          bg="var(--public-surface)"
          borderWidth="1px"
          borderColor="var(--public-border)"
          borderRadius="2xl"
          p={{ base: 6, md: 12 }}
          textAlign="center"
          boxShadow="0 16px 45px rgba(0,0,0,0.06)"
        >
          <VStack gap={5}>
            <Flex
              w="76px"
              h="76px"
              borderRadius="full"
              bg="var(--public-surface-alt)"
              color="var(--public-accent)"
              align="center"
              justify="center"
            >
              <StatusIcon size={34} />
            </Flex>

            <Heading
              size={{ base: "lg", md: "xl" }}
              color="var(--public-text)"
            >
              {title}
            </Heading>

            <Text
              color="var(--public-muted)"
              lineHeight="1.9"
              maxW="500px"
            >
              {description}
            </Text>

            <Flex
              gap={3}
              justify="center"
              wrap="wrap"
              pt={3}
            >
              <Button
                as={RouterLink}
                to="/programs"
                colorPalette="blue"
              >
                <FiArrowLeft />
                Back to Programs
              </Button>

              <Button
                as={RouterLink}
                to="/"
                variant="outline"
                borderColor="var(--public-border)"
                color="var(--public-text)"
              >
                <FiHome />
                Home
              </Button>
            </Flex>

            <Box
              mt={3}
              p={4}
              w="100%"
              borderRadius="xl"
              bg="var(--public-surface-alt)"
            >
              <Flex
                gap={2}
                align="center"
                justify="center"
              >
                <FiAlertCircle />

                <Text
                  fontSize="sm"
                  color="var(--public-muted)"
                >
                  If you believe this is a mistake,
                  please contact your college
                  administrator.
                </Text>
              </Flex>
            </Box>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}

export default function RequireCourseAccess() {
  const location = useLocation();

  const {
    isLoaded,
    isSignedIn,
    sessionId,
    getToken,
  } = useAuth();

  const [access, setAccess] = useState({
    status: "loading",
    sessionId: null,
    message: "",
  });

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !sessionId) {
      return;
    }

    const controller = new AbortController();

    setAccess({
      status: "loading",
      sessionId,
      message: "",
    });

    const verifyAccess = async () => {
      try {
        const token = await getToken();

        if (!token) {
          throw new Error(
            "Authentication token unavailable."
          );
        }

        const response = await api.get(
          "/auth/me",
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const user = response.data?.user;

        if (!user || user.isActive !== true) {
          throw new Error(
            "Your account is not active."
          );
        }

        if (!ALLOWED_ROLES.has(user.role)) {
          if (!controller.signal.aborted) {
            setAccess({
              status: "forbidden",
              sessionId,
              message:
                "Your account does not have permission to view courses.",
            });
          }
          return;
        }

        if (!controller.signal.aborted) {
          setAccess({
            status: "ready",
            sessionId,
            message: "",
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setAccess({
          status: "error",
          sessionId,
          message:
            error.response?.data?.message ||
            error.message ||
            "Unable to verify course access.",
        });
      }
    };

    verifyAccess();

    return () => controller.abort();
  }, [
    isLoaded,
    isSignedIn,
    sessionId,
    getToken,
  ]);

  if (!isLoaded || (isSignedIn && !sessionId)) {
    return (
      <Flex
        justify="center"
        align="center"
        minH="50vh"
      >
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  if (!isSignedIn) {
    return (
      <Navigate
        to={buildCourseLoginUrl(
          location.pathname
        )}
        replace
      />
    );
  }

  if (
    access.sessionId !== sessionId ||
    access.status === "loading"
  ) {
    return (
      <Flex
        justify="center"
        align="center"
        minH="50vh"
      >
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  if (access.status !== "ready") {
    return (
      <AccessStatus
        title={
          access.status === "forbidden"
            ? "Course Access Restricted"
            : "Unable to Verify Access"
        }
        description={access.message}
      />
    );
  }

  return <Outlet />;
}
