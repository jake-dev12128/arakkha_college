
import { useState } from "react";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  getSafeReturnUrl,
} from "../../utils/courseReturnUrl.js";
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

import { useSignIn } from "@clerk/react";

import AppLogo from "../../components/auth/AppLogo.jsx";
import useAuthStore from "../../store/authStore.js";

function Verify2FA() {
  const navigate = useNavigate();
const location = useLocation();

const returnUrl = getSafeReturnUrl(
  location.search
);
  const { signIn, errors, fetchStatus } = useSignIn();

  const loginIdentifier = useAuthStore(
    (state) => state.loginIdentifier,
  );

  const loginType = useAuthStore(
    (state) => state.loginType,
  );

  const clearLoginAttempt = useAuthStore(
    (state) => state.clearLoginAttempt,
  );

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleOtpChange = (event) => {
    setOtp(
      event.target.value.replace(/\D/g, "").slice(0, 6),
    );

    setError("");
    setMessage("");
  };

  const getErrorMessage = (error, fallback) => {
    return (
      error?.errors?.[0]?.longMessage ||
      error?.errors?.[0]?.message ||
      error?.longMessage ||
      error?.message ||
      fallback
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (otp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    if (!signIn) {
      setError("Authentication service is not ready yet.");
      return;
    }

    if (
      signIn.status !== "needs_client_trust" &&
      signIn.status !== "needs_second_factor"
    ) {
      setError(
        "There is no active email verification attempt. Please sign in again.",
      );
      return;
    }

    try {
      setLoading(true);


      const { error: verifyError } =
        await signIn.mfa.verifyEmailCode({ code: otp });

      if (verifyError) {
        setError(getErrorMessage(verifyError, "Invalid verification code."));
        return;
      }

      if (signIn.status !== "complete") {
        setError(`Verification is not complete: ${signIn.status}`);
        return;
      }

      const { error: finalizeError } = await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            setError("Complete the required Clerk session task before continuing.");
            return;
          }
const url = decorateUrl(returnUrl);          if (url.startsWith("http")) {
            window.location.assign(url);
          } else {
            navigate(url, { replace: true });
          }
        },
      });

      if (finalizeError) {
        setError(getErrorMessage(finalizeError, "Unable to activate your session."));
        return;
      }

      clearLoginAttempt();
    } catch (verificationError) {
      setError(
        getErrorMessage(
          verificationError,
          errors?.[0]?.message || "Verification failed.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setMessage("");

    if (!signIn) {
      setError("Authentication service is not ready yet.");
      return;
    }

    if (
      signIn.status !== "needs_client_trust" &&
      signIn.status !== "needs_second_factor"
    ) {
      setError(
        "No active verification attempt. Please sign in again.",
      );
      return;
    }

    try {
      setResending(true);

      const { error: resendError } =
        await signIn.mfa.sendEmailCode();

      if (resendError) {
        setError(
          getErrorMessage(
            resendError,
            "Unable to resend verification code.",
          ),
        );
        return;
      }

      setMessage(
        "A new verification code has been sent to your registered email.",
      );
    } catch (resendError) {
      setError(
        getErrorMessage(
          resendError,
          "Unable to resend verification code.",
        ),
      );
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = () => {
    clearLoginAttempt();

    navigate(
  `/acc/auth/login?returnTo=${encodeURIComponent(returnUrl)}`,
  { replace: true }
);
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
      <VStack w="full" maxW="430px" gap={5}>
        <AppLogo size="100px" />

        <Card.Root
          w="full"
          bg="white"
          border="1px solid"
          borderColor="gray.100"
          borderRadius="20px"
          boxShadow="0 12px 40px rgba(0, 0, 0, 0.08)"
        >
          <Card.Body p={{ base: 6, md: 8 }}>
            <VStack gap={5}>
              <Box textAlign="center">
                <Heading size="xl" fontWeight="700">
                  Verify Login
                </Heading>

                <Text mt={2} color="gray.500" fontSize="sm">
                  Enter the verification code sent to
                  your registered email.
                </Text>

                {loginIdentifier && (
                  <Text mt={2} fontWeight="600">
                    {loginType === "student"
                      ? `Student ID: ${loginIdentifier.toUpperCase()}`
                      : loginIdentifier}
                  </Text>
                )}
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

              {message && (
                <Alert.Root
                  status="success"
                  w="full"
                  borderRadius="10px"
                >
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      {message}
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
                    onChange={handleOtpChange}
                    placeholder="000000"
                    textAlign="center"
                    fontSize="2xl"
                    fontWeight="600"
                    letterSpacing="10px"
                    borderRadius="12px"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    disabled={loading || resending}
                  />

                  <Button
                    type="submit"
                    w="full"
                    size="lg"
                    borderRadius="12px"
                    colorPalette="blue"
                    loading={loading}
                    loadingText="Verifying..."
                    disabled={
                      loading ||
                      resending ||
                      otp.length !== 6 ||
                      fetchStatus === "fetching"
                    }
                  >
                    Verify Code
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    w="full"
                    onClick={handleResendCode}
                    loading={resending}
                    disabled={loading || resending}
                  >
                    Resend Code
                  </Button>

                  <Button
                    type="button"
                    variant="plain"
                    w="full"
                    onClick={handleBackToLogin}
                    disabled={loading || resending}
                  >
                    Back to Login
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

export default Verify2FA;
