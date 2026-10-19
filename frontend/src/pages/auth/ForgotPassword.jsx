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

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      await api.post(
        "/auth/forgot-password",
        {
          email: email.trim().toLowerCase(),
        }
      );

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
      minH="100vh"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      py={8}
    >
      <VStack
        w="full"
        maxW="430px"
        gap={5}
      >

        <AppLogo size="100px" />

        <Card.Root
          w="full"
          bg="white"
          borderRadius="20px"
          border="1px solid"
          borderColor="gray.100"
          boxShadow="0 12px 40px rgba(0,0,0,0.08)"
        >
          <Card.Body
            p={{ base: 6, md: 8 }}
          >
            <VStack gap={5}>

              <Box textAlign="center">
                <Heading size="xl">
                  Forgot Password?
                </Heading>

                <Text
                  mt={2}
                  color="gray.500"
                  fontSize="sm"
                >
                  Enter your email and
                  we'll send you a
                  verification code.
                </Text>
              </Box>

              {error && (
                <Alert.Root
                  status="error"
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
                style={{
                  width: "100%",
                }}
              >
                <VStack gap={4}>

                  <Field.Root required>
                    <Field.Label
                      fontWeight="600"
                    >
                      Email
                    </Field.Label>

                    <Input
                      type="email"
                      size="lg"
                      borderRadius="12px"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="Enter your email"
                    />
                  </Field.Root>

                  <Button
                    type="submit"
                    w="full"
                    size="lg"
                    borderRadius="12px"
                    colorPalette="blue"
                    loading={loading}
                    loadingText="Sending OTP..."
                  >
                    Send OTP
                  </Button>

                </VStack>
              </form>

              <Text
                fontSize="sm"
                color="gray.500"
              >
                Remember your password?{" "}
                <Link
                  color="blue.500"
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