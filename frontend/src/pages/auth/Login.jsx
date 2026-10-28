
import { useState } from "react";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  getSafeReturnUrl,
} from "../../utils/courseReturnUrl.js";

import {
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

import { useSignIn } from "@clerk/react";

import AppLogo from "../../components/auth/AppLogo.jsx";
import useAuthStore from "../../store/authStore.js";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const returnUrl = getSafeReturnUrl(location.search);

  const { signIn, errors, fetchStatus } = useSignIn();

  const setLoginAttempt = useAuthStore(
    (state) => state.setLoginAttempt,
  );

  const [loginType, setLoginType] = useState("staff");

  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==================================================
  // LOGIN
  // ==================================================

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!signIn) {
      setError(
        "Authentication service is not ready yet. Please try again.",
      );
      return;
    }

    const identifier =
      loginType === "student"
        ? studentId.trim().toLowerCase()
        : email.trim().toLowerCase();

    if (!identifier) {
      setError(
        loginType === "student"
          ? "Please enter your Student ID."
          : "Please enter your email.",
      );
      return;
    }

    if (
      loginType === "student" &&
      !/^acc\d{8}$/i.test(identifier)
    ) {
      setError(
        "Invalid Student ID format. Example: ACC20260001.",
      );
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      // CLERK PASSWORD LOGIN
      // Staff: email + password
      // Student: username + password

      const signInResult = await signIn.password({
        identifier,
        password,
      });

      const clerkError = signInResult?.error;

      if (clerkError) {
        setError(
          clerkError.longMessage ||
            clerkError.message ||
            "Login failed.",
        );
        return;
      }

      // LOGIN COMPLETE

      if (signIn.status === "complete") {
        if (!signIn.createdSessionId) {
          setError(
            "Login succeeded but no session was created.",
          );
          return;
        }

        const { error: finalizeError } =
          await signIn.finalize({
            navigate: ({ session, decorateUrl }) => {
              if (session?.currentTask) {
                setError(
                  "Complete the required Clerk session task before continuing.",
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
            finalizeError.longMessage ||
              finalizeError.message ||
              "Unable to activate your session.",
          );
        }

        return;
      }

      // DEVICE TRUST VERIFICATION

      if (signIn.status === "needs_client_trust") {
        const emailCodeFactor =
          signIn.supportedSecondFactors?.find(
            (factor) =>
              factor.strategy === "email_code",
          );

        if (!emailCodeFactor) {
          setError(
            "Email verification is not available for this account.",
          );
          return;
        }

        setLoginAttempt({
          email:
            loginType === "staff" ? identifier : "",
          identifier,
          loginType,
          signInAttempt: null,
        });

        const { error: sendCodeError } =
          await signIn.mfa.sendEmailCode();

        if (sendCodeError) {
          setError(
            sendCodeError.longMessage ||
              sendCodeError.message ||
              "Unable to send verification code.",
          );
          return;
        }

        navigate(
          `/acc/auth/verify-2fa?returnTo=${encodeURIComponent(returnUrl)}`,
          { replace: true },
        );

        return;
      }

      // NORMAL MFA

      if (signIn.status === "needs_second_factor") {
        const emailCodeFactor =
          signIn.supportedSecondFactors?.find(
            (factor) =>
              factor.strategy === "email_code",
          );

        if (!emailCodeFactor) {
          setError(
            "Email verification is not available for this account.",
          );
          return;
        }

        setLoginAttempt({
          email:
            loginType === "staff" ? identifier : "",
          identifier,
          loginType,
          signInAttempt: null,
        });

        const { error: sendCodeError } =
          await signIn.mfa.sendEmailCode();

        if (sendCodeError) {
          setError(
            sendCodeError.longMessage ||
              sendCodeError.message ||
              "Unable to send MFA code.",
          );
          return;
        }

        navigate(
          `/acc/auth/verify-2fa?returnTo=${encodeURIComponent(returnUrl)}`,
          { replace: true },
        );

        return;
      }

      setError(
        `Login is not complete. Clerk status: ${signIn.status}`,
      );
    } catch (loginError) {
      const message =
        loginError?.errors?.[0]?.longMessage ||
        loginError?.errors?.[0]?.message ||
        loginError?.message ||
        errors?.[0]?.message ||
        "Login failed.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // LOGIN UI
  // ==================================================

  return (
    <Box
      className="acc-auth"
      minH="100vh"
      bg="var(--auth-page)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      py={8}
    >
      <VStack w="full" maxW="430px" gap={5}>
        {/* LOGO */}

        <Box>
          <AppLogo size="100px" />
        </Box>

        {/* LOGIN CARD */}

        <Card.Root
          className="acc-auth-card"
          w="full"
          bg="var(--auth-card)"
          border="1px solid"
          borderColor="var(--auth-border)"
          borderRadius="20px"
          boxShadow="0 12px 40px rgba(0,0,0,0.08)"
        >
          <Card.Body p={{ base: 6, md: 8 }}>
            <form onSubmit={handleLogin}>
              <VStack gap={5}>
                {/* TITLE */}

                <Box textAlign="center" mb={2}>
                  <Heading
                    className="acc-auth-title"
                    size="xl"
                    fontWeight="700"
                  >
                    Welcome Back
                  </Heading>

                  <Text
                    mt={2}
                    className="acc-auth-muted"
                    color="var(--auth-muted)"
                    fontSize="sm"
                  >
                    Sign in to continue to your account
                  </Text>
                </Box>

                {/* LOGIN TYPE */}

                <Box w="full">
                  <Text
                    className="acc-auth-label"
                    fontSize="sm"
                    fontWeight="600"
                    mb={2}
                  >
                    Login as
                  </Text>

                  <Box
                    display="grid"
                    gridTemplateColumns="1fr 1fr"
                    gap={2}
                  >
                    <Button
                      type="button"
                      size="lg"
                      borderRadius="12px"
                      className={
                        loginType === "staff"
                          ? "acc-auth-primary"
                          : "acc-auth-inactive"
                      }
                      variant={
                        loginType === "staff"
                          ? "solid"
                          : "outline"
                      }
                      onClick={() => {
                        setLoginType("staff");
                        setError("");
                      }}
                      disabled={loading}
                    >
                      Staff
                    </Button>

                    <Button
                      type="button"
                      size="lg"
                      borderRadius="12px"
                      className={
                        loginType === "student"
                          ? "acc-auth-primary"
                          : "acc-auth-inactive"
                      }
                      variant={
                        loginType === "student"
                          ? "solid"
                          : "outline"
                      }
                      onClick={() => {
                        setLoginType("student");
                        setError("");
                      }}
                      disabled={loading}
                    >
                      Student
                    </Button>
                  </Box>

                  <Text
                    mt={2}
                    fontSize="xs"
                    className="acc-auth-muted"
                    color="var(--auth-muted)"
                  >
                    {loginType === "staff"
                      ? "Super Admin, Admin and Teacher sign in with email."
                      : "Students sign in with their assigned Student ID."}
                  </Text>
                </Box>

                {/* ERROR MESSAGE */}

                {error && (
                  <Box
                    w="full"
                    className="acc-auth-error"
                    bg="var(--auth-error-bg)"
                    color="var(--auth-error-text)"
                    borderRadius="10px"
                    px={4}
                    py={3}
                    fontSize="sm"
                    role="alert"
                  >
                    {error}
                  </Box>
                )}

                {/* STAFF EMAIL */}

                {loginType === "staff" && (
                  <Field.Root required>
                    <Field.Label
                      className="acc-auth-label"
                      fontWeight="600"
                    >
                      Email
                      <Field.RequiredIndicator />
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
                      autoComplete="username"
                      disabled={loading}
                    />
                  </Field.Root>
                )}

                {/* STUDENT ID */}

                {loginType === "student" && (
                  <Field.Root required>
                    <Field.Label
                      className="acc-auth-label"
                      fontWeight="600"
                    >
                      Student ID
                      <Field.RequiredIndicator />
                    </Field.Label>

                    <Input
                      className="acc-auth-input"
                      type="text"
                      size="lg"
                      borderRadius="12px"
                      value={studentId}
                      onChange={(event) =>
                        setStudentId(
                          event.target.value.toUpperCase(),
                        )
                      }
                      placeholder="ACC20260001"
                      autoComplete="username"
                      spellCheck={false}
                      disabled={loading}
                    />

                    <Text
                      fontSize="xs"
                      className="acc-auth-muted"
                      color="var(--auth-muted)"
                    >
                      Enter the Student ID assigned by ACC.
                    </Text>
                  </Field.Root>
                )}

                {/* PASSWORD */}

                <Field.Root required>
                  <Field.Label
                    className="acc-auth-label"
                    fontWeight="600"
                  >
                    Password
                    <Field.RequiredIndicator />
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
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </Field.Root>

                {/* FORGOT PASSWORD */}

                {loginType === "staff" && (
                  <Box
                    w="full"
                    textAlign="right"
                    mt="-2"
                  >
                    <Link
                      className="acc-auth-link"
                      color="var(--auth-accent)"
                      fontSize="sm"
                      fontWeight="600"
                      onClick={() =>
                        navigate(
                          "/acc/auth/forgot-password",
                        )
                      }
                      cursor="pointer"
                    >
                      Forgot Password?
                    </Link>
                  </Box>
                )}

                {/* LOGIN BUTTON */}

                <Button
                  type="submit"
                  w="full"
                  size="lg"
                  borderRadius="12px"
                  className="acc-auth-primary"
                  loading={
                    loading ||
                    fetchStatus === "fetching"
                  }
                  loadingText="Logging in..."
                  disabled={
                    loading ||
                    fetchStatus === "fetching"
                  }
                >
                  Login
                </Button>

                {/* REGISTRATION NOTICE */}

                <Text
                  fontSize="sm"
                  className="acc-auth-muted"
                  color="var(--auth-muted)"
                  textAlign="center"
                >
                  {loginType === "student"
                    ? "Student accounts are created by ACC administrators."
                    : "Staff accounts must be created by an authorized account."}
                </Text>
              </VStack>
            </form>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Box>
  );
}

export default Login;
