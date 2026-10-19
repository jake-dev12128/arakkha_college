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

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );

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

      await api.post(
       "/auth/reset-password",
        {
          resetToken,
          newPassword: password,
        }
      );

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

  if (!resetToken) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={6}
      >
        <VStack gap={4}>
          <Text>
            Invalid or expired reset session.
          </Text>

          <Button
            colorPalette="blue"
            onClick={() =>
              navigate(
                "/acc/auth/forgot-password"
              )
            }
          >
            Start Again
          </Button>
        </VStack>
      </Box>
    );
  }

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
                Reset Password
              </Heading>

              <Text
                mt={2}
                color="gray.500"
                fontSize="sm"
              >
                Create a new password
                for your account.
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

            {success && (
              <Alert.Root
                status="success"
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
                  <Field.Label>
                    New Password
                  </Field.Label>

                  <Input
                    type="password"
                    size="lg"
                    borderRadius="12px"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Enter new password"
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>
                    Confirm Password
                  </Field.Label>

                  <Input
                    type="password"
                    size="lg"
                    borderRadius="12px"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    placeholder="Confirm password"
                  />
                </Field.Root>

                <Button
                  type="submit"
                  w="full"
                  size="lg"
                  borderRadius="12px"
                  colorPalette="blue"
                  loading={loading}
                  loadingText="Resetting..."
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