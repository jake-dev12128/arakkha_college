
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

const creatableRoles = {
  super_admin: ["super_admin", "admin", "teacher", "student"],
  admin: ["admin", "teacher", "student"],
  teacher: ["student"],
};

export default function CreateAccount() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const roles = creatableRoles[user.role] ?? [];

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: roles[0] ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setCreated(null);

    if (!roles.includes(form.role)) {
      setError("Role not permitted.");
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

      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: roles[0],
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Account creation failed.",
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

          <Button
            type="submit"
            colorPalette="blue"
            loading={loading}
          >
            Create Account
          </Button>

          {user.role !== "teacher" && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate("/acc/auth/users")
              }
            >
              Back to User List
            </Button>
          )}
        </VStack>
      </Box>
    </VStack>
  );
}
