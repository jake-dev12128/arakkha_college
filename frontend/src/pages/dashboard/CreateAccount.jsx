
import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import {
  Box,
  Button,
  Field,
  Heading,
  Input,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react";

import { dashboardService } from "../../services/dashboard.service.js";
import { mediaService } from "../../services/media.service.js";
import ImageUploader from "../../components/common/ImageUploader.jsx";

const creatableRoles = {
  super_admin: ["super_admin", "admin", "teacher", "student"],
  admin: ["admin", "teacher", "student"],
  teacher: ["student"],
};

const initialForm = (roles) => ({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: roles[0] ?? "",
});

export default function CreateAccount() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const roles = creatableRoles[user.role] ?? [];

  const [form, setForm] = useState(() => initialForm(roles));
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const [uploadedImage, setUploadedImage] = useState(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [created, setCreated] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);

  const canManageImage =
    ["super_admin", "admin"].includes(user.role);

  const supportsImage =
    ["student", "teacher"].includes(form.role);

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "role") {
      setUploadedImage(null);
    }
  };

  const attachImage = async (targetUserId, mediaId) => {
    return mediaService.updateManagedProfileImage(
      targetUserId,
      mediaId
    );
  };

  const retryImageAttachment = async () => {
    if (!pendingImage) return;

    setLoading(true);
    setError("");
    setWarning("");

    try {
      await attachImage(
        pendingImage.userId,
        pendingImage.mediaId
      );

      setPendingImage(null);
      setUploadedImage(null);
      setWarning("");
    } catch (err) {
      setWarning(
        err?.response?.data?.message ||
          "Image attachment failed. You can retry."
      );
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setWarning("");
    setCreated(null);

    if (pendingImage) {
      setError(
        "Resolve the previous image attachment before creating another account."
      );
      return;
    }

    if (!roles.includes(form.role)) {
      setError("Role not permitted.");
      return;
    }

    if (imageUploading) {
      setError("Please wait for the image upload.");
      return;
    }

    try {
      setLoading(true);

      const result = await dashboardService.createUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });

      setCreated(result);

      const image = uploadedImage;

      if (
        image &&
        supportsImage &&
        canManageImage
      ) {
        const targetUserId = result?._id || result?.id;
        const mediaId = image?._id || image?.id;

        if (!targetUserId || !mediaId) {
          setWarning(
            "Account created, but image attachment could not start because an ID is missing."
          );
        } else {
          try {
            await attachImage(targetUserId, mediaId);
            setUploadedImage(null);
          } catch (attachError) {
            setPendingImage({
              userId: targetUserId,
              mediaId,
            });

            setWarning(
              attachError?.response?.data?.message ||
                "Account created, but profile image attachment failed. Retry below."
            );
          }
        }
      } else {
        setUploadedImage(null);
      }

      setForm(initialForm(roles));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Account creation failed."
      );
    } finally {
      setLoading(false);
    }
  };

  if (roles.length === 0) {
    return <Text>Access denied.</Text>;
  }

  return (
    <VStack align="stretch" gap={5} maxW="680px">
      <Box>
        <Heading size="2xl">
          {user.role === "teacher"
            ? "Register Student"
            : "Create Account"}
        </Heading>

        <Text color="fg.muted" mt={2}>
          Account credentials are managed by Clerk.
        </Text>
      </Box>

      {error && (
        <Text color="red.600" role="alert">
          {error}
        </Text>
      )}

      {warning && (
        <Box
          bg="orange.subtle"
          color="orange.fg"
          p={4}
          borderRadius="lg"
          role="alert"
        >
          <Text>{warning}</Text>

          {pendingImage && (
            <Button
              mt={3}
              size="sm"
              loading={loading}
              onClick={retryImageAttachment}
            >
              Retry Image Attachment
            </Button>
          )}
        </Box>
      )}

      {created && (
        <Box
          bg="green.subtle"
          color="green.fg"
          p={4}
          borderRadius="lg"
          role="status"
        >
          <Text fontWeight="700">
            Account created successfully.
          </Text>

          {created.studentId && (
            <Text mt={2}>
              Student ID: {created.studentId}
            </Text>
          )}

          {(created._id || created.id) && (
            <Text mt={2} fontSize="sm">
              User ID: {created._id || created.id}
            </Text>
          )}
        </Box>
      )}

      <Box
        as="form"
        onSubmit={submit}
        bg="bg.panel"
        borderWidth="1px"
        borderRadius="xl"
        p={5}
      >
        <VStack align="stretch" gap={4}>
          <Field.Root required>
            <Field.Label>First Name</Field.Label>
            <Input
              required
              value={form.firstName}
              onChange={(e) =>
                update("firstName", e.target.value)
              }
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label>Last Name</Field.Label>
            <Input
              required
              value={form.lastName}
              onChange={(e) =>
                update("lastName", e.target.value)
              }
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label>Email</Field.Label>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) =>
                update("email", e.target.value)
              }
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label>Temporary Password</Field.Label>
            <Input
              required
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) =>
                update("password", e.target.value)
              }
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label>New Account Role</Field.Label>

            <NativeSelect.Root>
              <NativeSelect.Field
                value={form.role}
                onChange={(e) =>
                  update("role", e.target.value)
                }
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.replaceAll("_", " ")}
                  </option>
                ))}
              </NativeSelect.Field>

              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          {supportsImage && canManageImage && (
            <Box>
              <Text fontWeight="600" mb={2}>
                Profile Image (Optional)
              </Text>

              <ImageUploader
                key={form.role}
                category="users"
                value={
                  uploadedImage?.secureUrl ||
                  uploadedImage?.url ||
                  ""
                }
                onUploaded={(image) => {
                  setUploadedImage(image);
                  setError("");
                }}
                onUploadingChange={setImageUploading}
              />

              {uploadedImage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  mt={3}
                  disabled={loading || imageUploading}
                  onClick={() => setUploadedImage(null)}
                >
                  Clear Selection
                </Button>
              )}

              <Text color="fg.muted" fontSize="xs" mt={2}>
                JPEG, PNG or WebP. Maximum 5 MB.
              </Text>
            </Box>
          )}

          <Button
            type="submit"
            colorPalette="blue"
            loading={loading}
            disabled={imageUploading || Boolean(pendingImage)}
          >
            Create Account
          </Button>

          {user.role !== "teacher" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/acc/auth/users")}
            >
              Back to User List
            </Button>
          )}
        </VStack>
      </Box>
    </VStack>
  );
}
