
import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Image,
  Input,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";

import {
  LuCamera,
  LuUserRound,
} from "react-icons/lu";

import api from "../../api/api.js";
import useAuthStore from "../../store/authStore.js";
import { mediaService } from "../../services/media.service.js";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function Dashboard() {
  const navigate = useNavigate();

  const { signOut, isLoaded, isSignedIn } = useAuth();

  const clearLoginAttempt = useAuthStore(
    (state) => state.clearLoginAttempt
  );

  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageSuccess, setImageSuccess] = useState("");

  // ==========================================
  // LOAD ACCOUNT DATA
  // ==========================================

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setUser(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          "/auth/me",
          { signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        const currentUser =
          response.data?.data?.user ??
          response.data?.user;

        if (!currentUser) {
          throw new Error("User data not found.");
        }

        setUser(currentUser);
        clearLoginAttempt();
      } catch (err) {
        if (
          controller.signal.aborted ||
          err?.code === "ERR_CANCELED"
        ) {
          return;
        }

        setError(
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load account overview."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => controller.abort();
  }, [isLoaded, isSignedIn, clearLoginAttempt]);

  // ==========================================
  // PROFILE IMAGE UPLOAD + ATTACH
  // ==========================================

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || imageUploading) return;

    setImageError("");
    setImageSuccess("");

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError(
        "Please select a JPEG, PNG or WebP image."
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Maximum image size is 5 MB.");
      return;
    }

    setImageUploading(true);

    try {
      // Step 1: Upload to Cloudinary
      const uploaded = await mediaService.uploadImage(
        "users",
        file
      );

      const mediaId =
        uploaded?.mediaId ??
        uploaded?.media?._id ??
        uploaded?._id;

      if (!mediaId) {
        throw new Error(
          "Upload succeeded, but Media ID was not returned."
        );
      }

      // Step 2: Attach image to current user
      const updated = await mediaService.updateMyProfileImage(
        mediaId
      );

      if (!updated?.profileImage) {
        throw new Error(
          "Profile image update response is incomplete."
        );
      }

      // Step 3: Update displayed user
      setUser((previous) => ({
        ...previous,
        profileImage: updated.profileImage,
        profileImageMediaId:
          updated.profileImageMediaId,
      }));

      setImageSuccess(
        "Profile photo updated successfully."
      );
    } catch (err) {
      setImageError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update profile photo."
      );
    } finally {
      setImageUploading(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await api.post("/auth/logout");

      await signOut();

      clearLoginAttempt();

      navigate("/acc/auth/login", {
        replace: true,
      });
    } catch (err) {
      setLogoutError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to log out."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (!isLoaded || loading) {
    return (
      <Flex
        className="acc-account-theme"
        minH="60vh"
        align="center"
        justify="center"
        color="var(--account-text)"
      >
        <VStack gap={4}>
          <Image
            src="/acc_logo.png"
            alt="ACC Computer College"
            boxSize="90px"
            objectFit="contain"
          />

          <Text
            fontSize="sm"
            color="var(--account-muted)"
          >
            Loading account overview...
          </Text>
        </VStack>
      </Flex>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error || !user) {
    return (
      <Box
        className="acc-account-theme"
        maxW="700px"
        mx="auto"
        py={8}
      >
        <Alert.Root
          status="error"
          borderRadius="12px"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              {error || "Account not available."}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      </Box>
    );
  }

  // ==========================================
  // ACCOUNT OVERVIEW
  // ==========================================

  return (
    <Box
      className="acc-account-theme"
      width="100%"
      maxW="1100px"
      mx="auto"
      px={{ base: 4, md: 6 }}
      py={{ base: 6, md: 8 }}
      color="var(--account-text)"
    >
      {logoutError && (
        <Alert.Root
          status="error"
          mb={5}
          borderRadius="12px"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              {logoutError}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      <Card.Root
        bg="var(--account-surface)"
        color="var(--account-text)"
        border="1px solid"
        borderColor="var(--account-border)"
        borderRadius="20px"
        boxShadow="0 8px 30px rgba(0,0,0,0.05)"
        maxW="760px"
        mx="auto"
        overflow="hidden"
      >
        <Card.Header px={6} pt={6}>
          <Text
            fontSize="xs"
            color="var(--account-accent)"
            fontWeight="700"
            mb={1}
          >
            MY ACCOUNT
          </Text>

          <Heading
            size="md"
            color="var(--account-text)"
          >
            Profile Information
          </Heading>
        </Card.Header>

        <Card.Body px={6} pb={6}>
          <VStack align="stretch" gap={0}>

            {/* PROFILE PHOTO */}

            <VStack gap={3} py={5}>
              <Box
                boxSize="116px"
                borderRadius="full"
                overflow="hidden"
                bg="var(--account-bg)"
                border="2px solid"
                borderColor="var(--account-border)"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {user.profileImage ? (
                  <Image
                    src={user.profileImage}
                    alt="Profile photo"
                    boxSize="100%"
                    objectFit="cover"
                  />
                ) : (
                  <LuUserRound size={48} />
                )}
              </Box>

              <Input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                display="none"
                disabled={imageUploading}
                onChange={handleProfileImageChange}
                aria-label="Choose profile photo"
              />

              <Button
                size="sm"
                variant="outline"
                borderColor="var(--account-border)"
                color="var(--account-text)"
                disabled={imageUploading}
                loading={imageUploading}
                loadingText="Uploading..."
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <LuCamera />
                {user.profileImage
                  ? "Change Profile Photo"
                  : "Upload Profile Photo"}
              </Button>

              <Text
                fontSize="xs"
                color="var(--account-muted)"
                textAlign="center"
              >
                JPEG, PNG or WebP • Maximum 5 MB
              </Text>

              {imageError && (
                <Alert.Root
                  status="error"
                  borderRadius="10px"
                  width="100%"
                >
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      {imageError}
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              {imageSuccess && (
                <Alert.Root
                  status="success"
                  borderRadius="10px"
                  width="100%"
                >
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      {imageSuccess}
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}
            </VStack>

            <Separator
              borderColor="var(--account-border)"
            />

            <ProfileField
              label="Full Name"
              value={[
                user.firstName,
                user.lastName,
              ]
                .filter(Boolean)
                .join(" ")}
            />

            <Separator
              borderColor="var(--account-border)"
            />

            <ProfileField
              label="Email Address"
              value={user.email || "Not provided"}
            />

            {user.role === "student" &&
              user.studentId && (
                <>
                  <Separator
                    borderColor="var(--account-border)"
                  />

                  <ProfileField
                    label="Student ID"
                    value={user.studentId}
                  />
                </>
              )}

            <Separator
              borderColor="var(--account-border)"
            />

            <Box py={4}>
              <Text
                fontSize="xs"
                color="var(--account-muted)"
                mb={2}
              >
                Account Role
              </Text>

              <Badge
                colorPalette="blue"
                variant="subtle"
                borderRadius="full"
                px={3}
                py={1}
                textTransform="capitalize"
              >
                {user.role?.replaceAll("_", " ") ||
                  "Unknown"}
              </Badge>
            </Box>

            <Separator
              borderColor="var(--account-border)"
            />

            <Box py={4}>
              <Text
                fontSize="xs"
                color="var(--account-muted)"
                mb={2}
              >
                Account Status
              </Text>

              <Badge
                colorPalette={
                  user.isActive ? "green" : "red"
                }
                variant="subtle"
                borderRadius="full"
                px={3}
                py={1}
              >
                {user.isActive
                  ? "Active"
                  : "Inactive"}
              </Badge>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  );
}

// ==========================================
// REUSABLE PROFILE FIELD
// ==========================================

function ProfileField({ label, value }) {
  return (
    <Box py={4}>
      <Text
        fontSize="xs"
        color="var(--account-muted)"
        mb={1}
      >
        {label}
      </Text>

      <Text
        fontWeight="600"
        color="var(--account-text)"
        wordBreak="break-word"
      >
        {value || "Not provided"}
      </Text>
    </Box>
  );
}

export default Dashboard;
