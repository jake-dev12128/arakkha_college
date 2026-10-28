
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
    (state) => state.loginIdentifier
  );

  const loginType = useAuthStore(
    (state) => state.loginType
  );

  const clearLoginAttempt = useAuthStore(
    (state) => state.clearLoginAttempt
  );

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleOtpChange = (event) => {
    setOtp(
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 6)
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
      setError(
        "Please enter the 6-digit verification code."
      );
      return;
    }

    if (!signIn) {
      setError(
        "Authentication service is not ready yet."
      );
      return;
    }

    if (
      signIn.status !== "needs_client_trust" &&
      signIn.status !== "needs_second_factor"
    ) {
      setError(
        "There is no active email verification attempt. Please sign in again."
      );
      return;
    }

    try {
      setLoading(true);

      const { error: verifyError } =
        await signIn.mfa.verifyEmailCode({
          code: otp,
        });

      if (verifyError) {
        setError(
          getErrorMessage(
            verifyError,
            "Invalid verification code."
          )
        );
        return;
      }

      if (signIn.status !== "complete") {
        setError(
          `Verification is not complete: ${signIn.status}`
        );
        return;
      }

      const { error: finalizeError } =
        await signIn.finalize({
          navigate: ({
            session,
            decorateUrl,
          }) => {
            if (session?.currentTask) {
              setError(
                "Complete the required Clerk session task before continuing."
              );
              return;
            }

            const url = decorateUrl(returnUrl);

            if (url.startsWith("http")) {
              window.location.assign(url);
            } else {
              navigate(url, { replace: true });
            }
          },
        });

      if (finalizeError) {
        setError(
          getErrorMessage(
            finalizeError,
            "Unable to activate your session."
          )
        );
        return;
      }

      clearLoginAttempt();
    } catch (verificationError) {
      setError(
        getErrorMessage(
          verificationError,
          errors?.[0]?.message ||
            "Verification failed."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setMessage("");

    if (!signIn) {
      setError(
        "Authentication service is not ready yet."
      );
      return;
    }

    if (
      signIn.status !== "needs_client_trust" &&
      signIn.status !== "needs_second_factor"
    ) {
      setError(
        "No active verification attempt. Please sign in again."
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
            "Unable to resend verification code."
          )
        );
        return;
      }

      setMessage(
        "A new verification code has been sent to your registered email."
      );
    } catch (resendError) {
      setError(
        getErrorMessage(
          resendError,
          "Unable to resend verification code."
        )
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
      <VStack
        w="full"
        maxW="430px"
        gap={5}
      >
        <AppLogo size="100px" />

        <Card.Root
          className="acc-auth-card"
          w="full"
          bg="var(--auth-card)"
          color="var(--auth-text)"
          border="1px solid"
          borderColor="var(--auth-border)"
          borderRadius="20px"
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
                  Verify Login
                </Heading>

                <Text
                  className="acc-auth-muted"
                  mt={2}
                  color="var(--auth-muted)"
                  fontSize="sm"
                >
                  Enter the verification code sent
                  to your registered email.
                </Text>

                {loginIdentifier && (
                  <Text
                    mt={2}
                    fontWeight="600"
                    color="var(--auth-text)"
                    overflowWrap="anywhere"
                  >
                    {loginType === "student"
                      ? `Student ID: ${loginIdentifier.toUpperCase()}`
                      : loginIdentifier}
                  </Text>
                )}
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

              {message && (
                <Alert.Root
                  status="success"
                  colorPalette="green"
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
                    className="acc-auth-input"
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
                    aria-label="Six-digit login verification code"
                    autoFocus
                    disabled={loading || resending}
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
                    className="acc-auth-inactive"
                    variant="outline"
                    w="full"
                    borderRadius="12px"
                    onClick={handleResendCode}
                    loading={resending}
                    disabled={loading || resending}
                  >
                    Resend Code
                  </Button>

                  <Button
                    type="button"
                    className="acc-auth-inactive"
                    variant="outline"
                    w="full"
                    borderRadius="12px"
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
