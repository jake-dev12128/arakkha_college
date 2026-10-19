
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@clerk/react";

import {
  Center,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import api from "../../api/api.js";
import { getDashboardConfig } from "../../config/dashboardMenus.js";

export default function ProtectedRoute() {
  const {
    isLoaded,
    isSignedIn,
    getToken,
    userId,
    sessionId,
  } = useAuth();

  const [state, setState] = useState({
    status: "loading",
    user: null,
    message: "",
    sessionId: null,
  });

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !sessionId) {
      return;
    }

    const controller = new AbortController();

    async function verifyAccount() {
      setState({
        status: "loading",
        user: null,
        message: "",
        sessionId,
      });

      try {
        const token = await getToken();

        if (!token) {
          throw new Error("Clerk session token unavailable.");
        }

        const response = await api.get("/auth/me", {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

const user =
  response.data?.data?.user ??
  response.data?.user;
        if (!user || user.isActive === false) {
          throw new Error("Invalid or inactive account.");
        }

        if (!getDashboardConfig(user.role)) {
          throw new Error("Unauthorized account role.");
        }

        if (!controller.signal.aborted) {
          setState({
            status: "ready",
            user,
            message: "",
            sessionId,
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          status: "error",
          user: null,
          sessionId,
          message:
            error?.response?.data?.message ||
            error.message ||
            "Account verification failed.",
        });
      }
    }

    verifyAccount();

    return () => controller.abort();
  }, [
    isLoaded,
    isSignedIn,
    getToken,
    userId,
    sessionId,
  ]);

  if (!isLoaded || (isSignedIn && !sessionId)) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/acc/auth/login" replace />;
  }

  if (
    state.sessionId !== sessionId ||
    state.status === "loading"
  ) {
    return (
      <Center minH="100vh">
        <VStack gap={4}>
          <Spinner size="xl" />
          <Text>Checking account security...</Text>
        </VStack>
      </Center>
    );
  }

  if (state.status === "error") {
    return (
      <Center minH="100vh" px={4}>
        <Text color="red.600">{state.message}</Text>
      </Center>
    );
  }

  return <Outlet context={{ user: state.user }} />;
}
