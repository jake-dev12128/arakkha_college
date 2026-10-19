import { useEffect, useState } from "react";

import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "@clerk/react";

import {
  Box,
  Center,
  Spinner,
  Text,
} from "@chakra-ui/react";

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

        // Existing ACC /auth/me response
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
                "Only students and teachers can view courses.",
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
      <Center py={20}>
        <Spinner size="xl" />
      </Center>
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
      <Center py={20}>
        <Spinner size="xl" />
      </Center>
    );
  }

  if (access.status !== "ready") {
    return (
      <Center py={20}>
        <Box textAlign="center">
          <Text color="red.500">
            {access.message}
          </Text>
        </Box>
      </Center>
    );
  }

  return <Outlet />;
}