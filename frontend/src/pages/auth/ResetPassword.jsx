
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Field,
  Heading,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import api from "../../api/api.js";
import AppLogo from "../../components/auth/AppLogo.jsx";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const resetToken =
    location.state?.resetToken || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/reset-password", {
        resetToken,
        newPassword: password,
      });

      setSuccess(
        "Your password has been reset successfully."
      );

      setTimeout(() => {
        navigate("/acc/auth/login");
      }, 1500);
    } catch (error) {
      setError(
        error?.response?.data?.message ||
          "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  // Missing reset session

  if (!resetToken) {
    return (
      <Box
        className="acc-auth"
        minH="100vh"
        bg="var(--auth-page)"
        color="var(--auth-text)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={4}
        py={8}
      >
        <Card.Root
          className="acc-auth-card"
          w="full"
          maxW="430px"
          bg="var(--auth-card)"
          color="var(--auth-text)"
          border="1px solid"
          borderColor="var(--auth-border)"
          borderRadius="20px"
        >
          <Card.Body p={8}>
            <VStack gap={5}>
              <Heading
                className="acc-auth-title"
                size="lg"
                textAlign="center"
              >
                Invalid Reset Session
              </Heading>

              <Text
                className="acc-auth-muted"
                color="var(--auth-muted)"
                textAlign="center"
              >
                Invalid or expired reset session.
                Please start the password recovery
                process again.
              </Text>

              <Button
                className="acc-auth-primary"
                w="full"
                size="lg"
                borderRadius="12px"
                onClick={() =>
                  navigate(
                    "/acc/auth/forgot-password"
                  )
                }
              >
                Start Again
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Box>
    );
  }

  return (
    <Box
      className="acc-auth"
      minH="100vh"
      bg="var(--auth-page)"
      color="var(--auth-text)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      py={8}
    >
      <VStack w="full" maxW="430px" gap={5}>
        <AppLogo size="100px" />

        <Card.Root
          className="acc-auth-card"
          w="full"
          bg="var(--auth-card)"
          color="var(--auth-text)"
          borderRadius="20px"
          border="1px solid"
          borderColor="var(--auth-border)"
          boxShadow="0 12px 40px rgba(0,0,0,0.08)"
        >
          <Card.Body p={{ base: 6, md: 8 }}>
            <VStack gap={5}>
              <Box textAlign="center">
                <Heading
                  className="acc-auth-title"
                  size="xl"
                  fontWeight="700"
                >
                  Reset Password
                </Heading>

                <Text
                  className="acc-auth-muted"
                  mt={2}
                  color="var(--auth-muted)"
                  fontSize="sm"
                >
                  Create a new password for your account.
                </Text>
              </Box>

              {error && (
                <Alert.Root
                  status="error"
                  className="acc-auth-error"
                  bg="var(--auth-error-bg)"
                  color="var(--auth-error-text)"
                  w="full"
                  borderRadius="10px"
                >
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      {error}
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              {success && (
                <Alert.Root
                  status="success"
                  colorPalette="green"
                  w="full"
                  borderRadius="10px"
                >
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      {success}
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              <form
                onSubmit={handleSubmit}
                style={{ width: "100%" }}
              >
                <VStack gap={4}>
                  <Field.Root required>
                    <Field.Label
                      className="acc-auth-label"
                      color="var(--auth-text)"
                      fontWeight="600"
                    >
                      New Password
                    </Field.Label>

                    <Input
                      className="acc-auth-input"
                      type="password"
                      size="lg"
                      borderRadius="12px"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </Field.Root>

                  <Field.Root required>
                    <Field.Label
                      className="acc-auth-label"
                      color="var(--auth-text)"
                      fontWeight="600"
                    >
                      Confirm Password
                    </Field.Label>

                    <Input
                      className="acc-auth-input"
                      type="password"
                      size="lg"
                      borderRadius="12px"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </Field.Root>

                  <Button
                    type="submit"
                    className="acc-auth-primary"
                    w="full"
                    size="lg"
                    borderRadius="12px"
                    loading={loading}
                    loadingText="Resetting..."
                    disabled={loading}
                  >
                    Reset Password
                  </Button>
                </VStack>
              </form>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Box>
  );
}

export default ResetPassword;
