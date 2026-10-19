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

function VerifyResetOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const email =
    location.state?.email || "";

  const [otp, setOtp] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response =
        await api.post(
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

  if (!email) {
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
            Reset session not found.
          </Text>

          <Button
            onClick={() =>
              navigate("/acc/auth/forgot-password")
            }
          >
            Request New OTP
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
                Verify OTP
              </Heading>

              <Text
                mt={2}
                color="gray.500"
                fontSize="sm"
              >
                Enter the code sent to
              </Text>

              <Text
                mt={1}
                fontWeight="600"
              >
                {email}
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
              style={{ width: "100%" }}
            >
              <VStack gap={4}>

                <Input
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
                />

                <Button
                  type="submit"
                  w="full"
                  size="lg"
                  borderRadius="12px"
                  colorPalette="blue"
                  loading={loading}
                  loadingText="Verifying..."
                >
                  Verify OTP
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  w="full"
                  onClick={() =>
                   navigate("/acc/auth/forgot-password")
                  }
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