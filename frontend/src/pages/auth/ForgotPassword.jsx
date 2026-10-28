
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Field,
  Heading,
  Input,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

import api from "../../api/api.js";
import AppLogo from "../../components/auth/AppLogo.jsx";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      navigate("/acc/auth/verify-reset-otp", {
        state: {
          email: email.trim().toLowerCase(),
        },
      });
    } catch (error) {
      setError(
        error?.response?.data?.message ||
          "Unable to process your request."
      );
    } finally {
      setLoading(false);
    }
  };

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
                  color="var(--auth-text)"
                >
                  Forgot Password?
                </Heading>

                <Text
                  className="acc-auth-muted"
                  mt={2}
                  color="var(--auth-muted)"
                  fontSize="sm"
                >
                  Enter your email and we'll send you a
                  verification code.
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
                  <Field.Root required>
                    <Field.Label
                      className="acc-auth-label"
                      color="var(--auth-text)"
                      fontWeight="600"
                    >
                      Email
                    </Field.Label>

                    <Input
                      className="acc-auth-input"
                      type="email"
                      size="lg"
                      borderRadius="12px"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder="Enter your email"
                      autoComplete="email"
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
                    loadingText="Sending OTP..."
                  >
                    Send OTP
                  </Button>
                </VStack>
              </form>

              <Text
                className="acc-auth-muted"
                fontSize="sm"
                color="var(--auth-muted)"
                textAlign="center"
              >
                Remember your password?{" "}
                <Link
                  className="acc-auth-link"
                  color="var(--auth-accent)"
                  fontWeight="600"
                  cursor="pointer"
                  onClick={() =>
                    navigate("/acc/auth/login")
                  }
                >
                  Login
                </Link>
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Box>
  );
}

export default ForgotPassword;
