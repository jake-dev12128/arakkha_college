import { useEffect, useState } from "react";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";

function Sessions() {

  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==================================================
  // LOAD SESSIONS
  // ==================================================

  const loadSessions = async (signal) => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/sessions", { signal });

      setSessions(response.data.data.sessions || []);
    } catch (error) {
      if (error?.code === "ERR_CANCELED") return;

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load sessions.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    const controller = new AbortController();
    loadSessions(controller.signal);

    return () => controller.abort();
  }, []);

  // ==================================================
  // REVOKE SPECIFIC SESSION
  // ==================================================

  const handleRevokeSession = async (sessionId) => {
    try {
      setRevokingSessionId(sessionId);

      setError("");
      setSuccess("");

      const response = await api.delete(`/sessions/${sessionId}`);

      setSuccess(
        response.data.message ||
          "Session revoked successfully.",
      );

      await loadSessions();
    } catch (error) {

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to revoke session.";

      setError(message);
    } finally {
      setRevokingSessionId(null);
    }
  };

  // ==================================================
  // REVOKE OTHER SESSIONS
  // ==================================================

  const handleRevokeOthers = async () => {
    try {
      setRevokingOthers(true);

      setError("");
      setSuccess("");

      const response = await api.post("/sessions/revoke-others");

      setSuccess(
        response.data.message ||
          "All other sessions have been revoked successfully.",
      );

      await loadSessions();
    } catch (error) {

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to revoke other sessions.";

      setError(message);
    } finally {
      setRevokingOthers(false);
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <Box
        minH="100vh"
        bg="gray.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack gap={4}>
          <Spinner size="xl" />

          <Text color="gray.500">
            Loading sessions...
          </Text>
        </VStack>
      </Box>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  const activeOtherSessions = sessions.filter(
    (session) => !session.isRevoked,
  );

  return (
    <Box minH="100vh" bg="gray.50">

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <Box
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.100"
      >
        <Flex
          maxW="1000px"
          mx="auto"
          px={6}
          py={5}
          align="center"
          justify="space-between"
        >
          <Box>
            <Text
              fontSize="sm"
              color="blue.600"
              fontWeight="600"
            >
              SECURITY
            </Text>

            <Heading size="lg">
              Active Sessions
            </Heading>
          </Box>

          <Button
            variant="outline"
            onClick={() => navigate("/acc/auth/dashboard")}
          >
            Dashboard
          </Button>
        </Flex>
      </Box>

      {/* ================================================== */}
      {/* CONTENT */}
      {/* ================================================== */}

      <Box
        maxW="1000px"
        mx="auto"
        px={6}
        py={10}
      >

        {/* SUCCESS */}

        {success && (
          <Alert.Root
            status="success"
            mb={6}
            borderRadius="14px"
          >
            <Alert.Indicator />

            <Alert.Content>
              <Alert.Description>
                {success}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {/* ERROR */}

        {error && (
          <Alert.Root
            status="error"
            mb={6}
            borderRadius="14px"
          >
            <Alert.Indicator />

            <Alert.Content>
              <Alert.Description>
                {error}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {/* ================================================== */}
        {/* SESSION MANAGEMENT CARD */}
        {/* ================================================== */}

        <Card.Root
          bg="white"
          border="1px solid"
          borderColor="gray.100"
          borderRadius="20px"
          boxShadow="0 8px 30px rgba(0,0,0,0.05)"
        >
          <Card.Header
            px={6}
            pt={6}
            pb={4}
          >
            <Flex
              justify="space-between"
              align="center"
              gap={4}
            >
              <Box>
                <Heading size="md">
                  Your Sessions
                </Heading>

                <Text
                  mt={1}
                  fontSize="sm"
                  color="gray.500"
                >
                  Manage devices currently signed in
                  to your account.
                </Text>
              </Box>

              <Button
                colorPalette="red"
                variant="outline"
                borderRadius="10px"
                disabled={
                  activeOtherSessions.length === 0 ||
                  revokingOthers
                }
                loading={revokingOthers}
                onClick={handleRevokeOthers}
              >
                Sign out other sessions
              </Button>
            </Flex>
          </Card.Header>

          <Card.Body px={6} pb={6}>

            <VStack
              align="stretch"
              gap={0}
            >

              {sessions.map((session, index) => {

                const isCurrent = session.isCurrent;

                return (
                  <Box key={session._id}>

                    {index > 0 && <Separator />}

                    <Flex
                      py={5}
                      justify="space-between"
                      align={{
                        base: "flex-start",
                        md: "center",
                      }}
                      direction={{
                        base: "column",
                        md: "row",
                      }}
                      gap={4}
                    >

                      {/* DEVICE INFO */}

                      <Box flex="1">

                        <Flex
                          align="center"
                          gap={3}
                          mb={2}
                        >
                          <Text
                            fontWeight="700"
                            color="gray.800"
                          >
                            {session.deviceName}
                          </Text>

                          {isCurrent && (
                            <Badge
                              colorPalette="green"
                              variant="subtle"
                              borderRadius="full"
                            >
                              This device
                            </Badge>
                          )}

                          {session.isRevoked && (
                            <Badge
                              colorPalette="red"
                              variant="subtle"
                              borderRadius="full"
                            >
                              Revoked
                            </Badge>
                          )}
                        </Flex>

                        <Text
                          fontSize="sm"
                          color="gray.600"
                        >
                          {session.browser}
                          {" · "}
                          {session.operatingSystem}
                        </Text>

                        <Text
                          fontSize="xs"
                          color="gray.500"
                          mt={1}
                        >
                          IP: {session.ipAddress || "Unknown"}
                        </Text>

                        <Text
                          fontSize="xs"
                          color="gray.500"
                          mt={1}
                        >
                          Last active:{" "}
                          {new Date(
                            session.lastActiveAt,
                          ).toLocaleString()}
                        </Text>

                        {session.isRevoked &&
                          session.revokedAt && (
                            <Text
                              fontSize="xs"
                              color="red.500"
                              mt={1}
                            >
                              Revoked:{" "}
                              {new Date(
                                session.revokedAt,
                              ).toLocaleString()}
                            </Text>
                          )}

                      </Box>

                      {/* ACTION */}

                      {!session.isRevoked &&
                        !isCurrent && (
                          <Button
                            size="sm"
                            colorPalette="red"
                            variant="outline"
                            loading={
                              revokingSessionId ===
                              session._id
                            }
                            disabled={
                              revokingSessionId !== null
                            }
                            onClick={() =>
                              handleRevokeSession(
                                session._id,
                              )
                            }
                          >
                            Sign out
                          </Button>
                        )}

                    </Flex>

                  </Box>
                );
              })}

            </VStack>

          </Card.Body>
        </Card.Root>

      </Box>
    </Box>
  );
}

export default Sessions;