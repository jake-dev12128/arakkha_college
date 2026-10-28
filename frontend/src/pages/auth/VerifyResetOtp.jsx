
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
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

function VerifyResetOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await api.post(
        "/auth/forgot-password/verify",
        {
          email,
          otp,
        }
      );

      const resetToken =
        response.data?.data?.resetToken;

      if (!resetToken) {
        throw new Error(
          "Reset token was not returned."
        );
      }

      navigate("/acc/auth/reset-password", {
        state: {
          resetToken,
          email,
        },
      });
    } catch (error) {
      setError(
        error?.response?.data?.message ||
          "Invalid or expired OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  // Missing reset session

  if (!email) {
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
                Reset Session Not Found
              </Heading>

              <Text
                className="acc-auth-muted"
                color="var(--auth-muted)"
                textAlign="center"
              >
                Your password reset session is missing.
                Please request a new verification code.
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
                Request New OTP
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
                  Verify OTP
                </Heading>

                <Text
                  className="acc-auth-muted"
                  mt={2}
                  color="var(--auth-muted)"
                  fontSize="sm"
                >
                  Enter the code sent to
                </Text>

                <Text
                  mt={1}
                  fontWeight="600"
                  color="var(--auth-text)"
                  overflowWrap="anywhere"
                >
                  {email}
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

              <form
                onSubmit={handleSubmit}
                style={{ width: "100%" }}
              >
                <VStack gap={4}>
                  <Input
                    className="acc-auth-input"
                    size="lg"
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6)
                      )
                    }
                    placeholder="000000"
                    textAlign="center"
                    fontSize="2xl"
                    fontWeight="600"
                    letterSpacing="10px"
                    borderRadius="12px"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label="Six-digit verification code"
                    disabled={loading}
                  />

                  <Button
                    type="submit"
                    className="acc-auth-primary"
                    w="full"
                    size="lg"
                    borderRadius="12px"
                    loading={loading}
                    loadingText="Verifying..."
                    disabled={
                      loading || otp.length !== 6
                    }
                  >
                    Verify OTP
                  </Button>

                  <Button
                    type="button"
                    className="acc-auth-inactive"
                    variant="outline"
                    w="full"
                    borderRadius="12px"
                    onClick={() =>
                      navigate(
                        "/acc/auth/forgot-password"
                      )
                    }
                    disabled={loading}
                  >
                    Request New OTP
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

export default VerifyResetOtp;
