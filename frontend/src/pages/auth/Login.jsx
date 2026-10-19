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

const returnUrl = getSafeReturnUrl(
  location.search
);
  const { signIn, errors, fetchStatus } = useSignIn();

  const setLoginAttempt = useAuthStore(
    (state) => state.setLoginAttempt,
  );

  // Login type: staff or student
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

    // Validate identifier
    if (!identifier) {
      setError(
        loginType === "student"
          ? "Please enter your Student ID."
          : "Please enter your email.",
      );
      return;
    }

    // Expected format: ACC20260001
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

      // ==============================================
      // CLERK PASSWORD LOGIN
      // ==============================================
      //
      // Staff:
      //   emailAddress + password
      //
      // Student:
      //   username + password
      //
      // Student username is created in Clerk when
      // the account is created by authorized staff.
      // ==============================================

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

      // ==============================================
      // LOGIN COMPLETE
      // ==============================================

      if (signIn.status === "complete") {
        if (!signIn.createdSessionId) {
          setError(
            "Login succeeded but no session was created.",
          );
          return;
        }

        const { error: finalizeError } = await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              setError("Complete the required Clerk session task before continuing.");
              return;
            }
const url = decorateUrl(returnUrl);            if (url.startsWith("http")) {
              window.location.assign(url);
            } else {
              navigate(url, { replace: true });
            }
          },
        });
        if (finalizeError) {
          setError(finalizeError.longMessage || finalizeError.message || "Unable to activate your session.");
        }
        return;
      }

      // ==============================================
      // DEVICE TRUST VERIFICATION
      // ==============================================

    if (signIn.status === "needs_client_trust") {
  const emailCodeFactor =
    signIn.supportedSecondFactors?.find(
      (factor) => factor.strategy === "email_code",
    );

  if (!emailCodeFactor) {
    setError(
      "Email verification is not available for this account.",
    );
    return;
  }

  setLoginAttempt({
    email: loginType === "staff" ? identifier : "",
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
  { replace: true }
);

  return;
}
      // ==============================================
      // NORMAL MFA
      // ==============================================

    if (signIn.status === "needs_second_factor") {
  const emailCodeFactor =
    signIn.supportedSecondFactors?.find(
      (factor) => factor.strategy === "email_code",
    );

  if (!emailCodeFactor) {
    setError(
      "Email verification is not available for this account.",
    );
    return;
  }

  setLoginAttempt({
    email: loginType === "staff" ? identifier : "",
    identifier,
    loginType,
    signInAttempt: null,
  });

  const { error: sendCodeError } = await signIn.mfa.sendEmailCode();
  if (sendCodeError) {
    setError(sendCodeError.longMessage || sendCodeError.message || "Unable to send MFA code.");
    return;
  }

navigate(
  `/acc/auth/verify-2fa?returnTo=${encodeURIComponent(returnUrl)}`,
  { replace: true }
);  return;
}

      // ==============================================
      // OTHER CLERK STATUS
      // ==============================================

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
  // UI
  // ==================================================

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
        {/* LOGO */}

        <Box>
          <AppLogo size="100px" />
        </Box>

        {/* LOGIN CARD */}

        <Card.Root
          w="full"
          bg="white"
          border="1px solid"
          borderColor="gray.100"
          borderRadius="20px"
          boxShadow="0 12px 40px rgba(0, 0, 0, 0.08)"
        >
          <Card.Body p={{ base: 6, md: 8 }}>
            <form onSubmit={handleLogin}>
              <VStack gap={5}>
                {/* TITLE */}

                <Box textAlign="center" mb={2}>
                  <Heading size="xl" fontWeight="700">
                    Welcome Back
                  </Heading>

                  <Text mt={2} color="gray.500" fontSize="sm">
                    Sign in to continue to your account
                  </Text>
                </Box>

                {/* LOGIN TYPE */}

                <Box w="full">
                  <Text
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
                      colorPalette={
                        loginType === "staff" ? "blue" : "gray"
                      }
                      variant={
                        loginType === "staff" ? "solid" : "outline"
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
                      colorPalette={
                        loginType === "student" ? "blue" : "gray"
                      }
                      variant={
                        loginType === "student" ? "solid" : "outline"
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

                  <Text mt={2} fontSize="xs" color="gray.500">
                    {loginType === "staff"
                      ? "Super Admin, Admin and Teacher sign in with email."
                      : "Students sign in with their assigned Student ID."}
                  </Text>
                </Box>

                {/* ERROR */}

                {error && (
                  <Box
                    w="full"
                    bg="red.50"
                    color="red.600"
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
                    <Field.Label fontWeight="600">
                      Email
                      <Field.RequiredIndicator />
                    </Field.Label>

                    <Input
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
                    <Field.Label fontWeight="600">
                      Student ID
                      <Field.RequiredIndicator />
                    </Field.Label>

                    <Input
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

                    <Text fontSize="xs" color="gray.500">
                      Enter the Student ID assigned by ACC.
                    </Text>
                  </Field.Root>
                )}

                {/* PASSWORD */}

                <Field.Root required>
                  <Field.Label fontWeight="600">
                    Password
                    <Field.RequiredIndicator />
                  </Field.Label>

                  <Input
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
                  <Box w="full" textAlign="right" mt="-2">
                    <Link
                      color="blue.500"
                      fontSize="sm"
                      fontWeight="600"
                      onClick={() =>
                        navigate("/acc/auth/forgot-password")
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
                  colorPalette="blue"
                  loading={loading || fetchStatus === "fetching"}
                  loadingText="Logging in..."
                  disabled={
                    loading || fetchStatus === "fetching"
                  }
                >
                  Login
                </Button>

                {/* REGISTRATION NOTICE */}

                <Text
                  fontSize="sm"
                  color="gray.500"
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
