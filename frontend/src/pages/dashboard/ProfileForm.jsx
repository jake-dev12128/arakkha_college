
import { useEffect, useRef, useState } from "react";

import {
  Box,
  Button,
  Field,
  Flex,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { dashboardService } from "../../services/dashboard.service.js";

// ==================================================
// CONSTANTS
// ==================================================

const createEmptyForm = () => ({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  address: "",
  currentAddress: "",
  age: "",
  fatherName: "",
  motherName: "",
  nationalId: "",
  dateOfBirth: "",
  gender: "male",
  matriculationScores: [],
});

const personalFields = [
  ["address", "Permanent Address"],
  ["currentAddress", "Current Address"],
  ["age", "Age"],
  ["fatherName", "Father Name"],
  ["motherName", "Mother Name"],
  ["nationalId", "NRC Number"],
  ["dateOfBirth", "Date of Birth"],
];

const personalKeys = [
  "address",
  "currentAddress",
  "age",
  "fatherName",
  "motherName",
  "nationalId",
  "dateOfBirth",
  "gender",
];

// ==================================================
// HELPERS
// ==================================================

const errorMessage = (error) => {
  const response = error?.response?.data;

  return (
    response?.message ||
    error?.message ||
    "Operation failed."
  );
};

const normalizeScores = (scores = []) =>
  scores.map((score) => ({
    subject: String(score.subject ?? "").trim(),
    score: String(score.score ?? ""),
  }));

const getComparableValue = (field, value) => {
  if (field === "age") {
    return value === "" || value == null
      ? ""
      : String(value);
  }

  return String(value ?? "").trim();
};

const buildPersonalPayload = (
  form,
  original,
  isStudent,
  isEdit
) => {
  const payload = {};

  for (const key of personalKeys) {
    const current = getComparableValue(
      key,
      form[key]
    );

    const previous = getComparableValue(
      key,
      original?.[key]
    );

    if (isEdit && current === previous) {
      continue;
    }

    if (key === "age") {
      if (current === "") {
        throw new Error("Age is required.");
      }

      const age = Number(current);

      if (
        !Number.isInteger(age) ||
        age < 1 ||
        age > 120
      ) {
        throw new Error(
          "Age must be between 1 and 120."
        );
      }

      payload.age = age;
      continue;
    }

    if (!current) {
      throw new Error(
        `${key} cannot be empty.`
      );
    }

    payload[key] = current;
  }

  if (isStudent) {
    const currentScores = normalizeScores(
      form.matriculationScores
    );

    const previousScores = normalizeScores(
      original?.matriculationScores
    );

    const changed =
      JSON.stringify(currentScores) !==
      JSON.stringify(previousScores);

    if (!isEdit || changed) {
      if (currentScores.length > 30) {
        throw new Error(
          "Maximum 30 subjects are allowed."
        );
      }

      payload.matriculationScores =
        currentScores.map((item) => {
          if (!item.subject) {
            throw new Error(
              "Subject name is required."
            );
          }

          if (item.score === "") {
            throw new Error(
              "Subject score is required."
            );
          }

          const score = Number(item.score);

          if (
            !Number.isFinite(score) ||
            score < 0 ||
            score > 100
          ) {
            throw new Error(
              "Subject score must be between 0 and 100."
            );
          }

          return {
            subject: item.subject,
            score,
          };
        });
    }
  }

  return payload;
};

// ==================================================
// PROFILE FORM
// ==================================================

export default function ProfileForm({
  role,
  mode = "create",
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const isStudent = role === "student";
  const isEdit = mode === "edit";

  const resource = isStudent
    ? "students"
    : "teachers";

  const label = isStudent
    ? "Student"
    : "Teacher";

  const [form, setForm] = useState(
    createEmptyForm
  );

  const [profileId, setProfileId] =
    useState(null);

  const [loading, setLoading] =
    useState(isEdit);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const originalRef = useRef(null);

  // ==================================================
  // UPDATE FORM FIELD
  // ==================================================

  const update = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ==================================================
  // LOAD EXISTING PROFILE
  // ==================================================

  useEffect(() => {
    if (!isEdit) {
      originalRef.current = null;
      setProfileId(null);
      setForm(createEmptyForm());
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        // URL id is MongoDB User ID,
        // not Student/Teacher Profile ID.

        const result =
          await dashboardService.getProfileByUserId(
            role,
            id,
            controller.signal
          );

        if (controller.signal.aborted) {
          return;
        }

        const { profile, user } = result;

        if (!profile?._id || !user) {
          throw new Error(
            "Student/Teacher profile not found."
          );
        }

        const loadedForm = {
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          email: user.email ?? "",
          password: "",
          address: profile.address ?? "",
          currentAddress:
            profile.currentAddress ?? "",
          age: String(profile.age ?? ""),
          fatherName:
            profile.fatherName ?? "",
          motherName:
            profile.motherName ?? "",
          nationalId:
            profile.nationalId ?? "",
          dateOfBirth:
            profile.dateOfBirth
              ? String(
                  profile.dateOfBirth
                ).slice(0, 10)
              : "",
          gender: profile.gender ?? "male",
          matriculationScores:
            normalizeScores(
              profile.matriculationScores ?? []
            ),
        };

        setProfileId(profile._id);
        setForm(loadedForm);

        originalRef.current = structuredClone(
          loadedForm
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(errorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => controller.abort();
  }, [id, isEdit, role]);

  // ==================================================
  // MATRICULATION SCORES
  // ==================================================

  const addScore = () => {
    setForm((previous) => ({
      ...previous,
      matriculationScores: [
        ...previous.matriculationScores,
        {
          subject: "",
          score: "",
        },
      ],
    }));
  };

  const updateScore = (
    index,
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      matriculationScores:
        previous.matriculationScores.map(
          (item, currentIndex) =>
            currentIndex === index
              ? {
                  ...item,
                  [field]: value,
                }
              : item
        ),
    }));
  };

  const removeScore = (index) => {
    setForm((previous) => ({
      ...previous,
      matriculationScores:
        previous.matriculationScores.filter(
          (_, currentIndex) =>
            currentIndex !== index
        ),
    }));
  };

  // ==================================================
  // SUBMIT
  // ==================================================

  const submit = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const firstName =
        form.firstName.trim();

      const lastName =
        form.lastName.trim();

      if (!firstName || !lastName) {
        throw new Error(
          "First name and last name are required."
        );
      }

      if (isEdit) {
        if (!profileId || !id) {
          throw new Error(
            "Profile or User ID not found."
          );
        }

        if (!originalRef.current) {
          throw new Error(
            "Original profile data is missing."
          );
        }

        const original =
          originalRef.current;

        const identityChanges = {};

        if (
          firstName !== original.firstName
        ) {
          identityChanges.firstName =
            firstName;
        }

        if (
          lastName !== original.lastName
        ) {
          identityChanges.lastName =
            lastName;
        }

        const personalChanges =
          buildPersonalPayload(
            form,
            original,
            isStudent,
            true
          );

        const hasIdentityChanges =
          Object.keys(
            identityChanges
          ).length > 0;

        const hasPersonalChanges =
          Object.keys(
            personalChanges
          ).length > 0;

        if (
          !hasIdentityChanges &&
          !hasPersonalChanges
        ) {
          setSuccess(
            "No changes to save."
          );
          return;
        }

        // Personal profile update first.
        // Identity update second.
        //
        // These are separate API operations,
        // not one atomic transaction.

        if (hasPersonalChanges) {
          await dashboardService.updateProfile(
            role,
            profileId,
            personalChanges
          );

          originalRef.current = {
            ...originalRef.current,
            ...structuredClone(form),
          };

          // Identity fields have not yet
          // been updated at this point.

          originalRef.current.firstName =
            original.firstName;

          originalRef.current.lastName =
            original.lastName;
        }

        if (hasIdentityChanges) {
          await dashboardService.updateUser(
            id,
            identityChanges
          );

          originalRef.current = {
            ...originalRef.current,
            firstName,
            lastName,
          };
        }

        navigate(
          `/acc/auth/${resource}`,
          { replace: true }
        );

        return;
      }

      // ==========================================
      // CREATE MODE
      // ==========================================

      const personal =
        buildPersonalPayload(
          form,
          null,
          isStudent,
          false
        );

      if (!form.password) {
        throw new Error(
          "Account password is required."
        );
      }

      await dashboardService.createUser({
        role,
        firstName,
        lastName,
        email:
          form.email.trim().toLowerCase(),
        password: form.password,
        ...personal,
      });

      navigate(
        `/acc/auth/${resource}`,
        { replace: true }
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <Flex
        align="center"
        justify="center"
        minH="240px"
        gap={3}
      >
        <Spinner color="#253783" />
        <Text color="#74809A">
          Loading {label.toLowerCase()} profile...
        </Text>
      </Flex>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <VStack
      align="stretch"
      gap={6}
      w="100%"
      maxW="900px"
      minW="0"
      color="#202B45"
    >
      {/* PAGE HEADER */}

      <Box>
        <HStack gap={2} mb={2}>
          <Box
            w="4px"
            h="30px"
            bg="#F2A23A"
            borderRadius="full"
          />

          <Heading
            size="2xl"
            color="#192968"
            fontWeight="750"
          >
            {isEdit ? "Edit" : "Add"}{" "}
            {label}
          </Heading>
        </HStack>

        <Text
          color="#74809A"
          fontSize="sm"
        >
          {isEdit
            ? `Update ${label.toLowerCase()} account and personal information.`
            : `Create a new ${label.toLowerCase()} account and profile.`}
        </Text>
      </Box>

      {/* ERROR MESSAGE */}

      {error && (
        <Box
          p={4}
          bg="#FFF5F5"
          border="1px solid #F3C7CC"
          borderRadius="12px"
          role="alert"
        >
          <Text
            color="#B83245"
            fontSize="sm"
          >
            {error}
          </Text>
        </Box>
      )}

      {/* SUCCESS MESSAGE */}

      {success && (
        <Box
          p={4}
          bg="#E4F6ED"
          border="1px solid #BCE5D0"
          borderRadius="12px"
        >
          <Text
            color="#13784F"
            fontSize="sm"
          >
            {success}
          </Text>
        </Box>
      )}

      {/* MAIN FORM */}

      <Box
        as="form"
        onSubmit={submit}
        bg="white"
        border="1px solid #E1E6F0"
        borderRadius="16px"
        p={{ base: 4, md: 7 }}
        boxShadow="0 4px 20px rgba(25,41,104,0.06)"
      >
        <VStack
          align="stretch"
          gap={7}
        >
          {/* ACCOUNT INFORMATION */}

          <Box>
            <Heading
              size="md"
              color="#192968"
              mb={2}
            >
              01 — Account Information
            </Heading>

            <Text
              fontSize="sm"
              color="#74809A"
              mb={5}
            >
              Basic account details
            </Text>

            <Flex
              gap={4}
              flexWrap="wrap"
            >
              {[
                ["firstName", "First Name"],
                ["lastName", "Last Name"],
                ["email", "Email"],
              ].map(([key, title]) => {
                const emailField =
                  key === "email";

                const readOnly =
                  isEdit && emailField;

                return (
                  <Field.Root
                    key={key}
                    flex="1"
                    minW={{
                      base: "100%",
                      sm: "220px",
                    }}
                  >
                    <Field.Label
                      color="#43506C"
                      fontWeight="600"
                    >
                      {title}
                    </Field.Label>

                    <Input
                      type={
                        emailField
                          ? "email"
                          : "text"
                      }
                      value={form[key]}
                      onChange={(event) =>
                        update(
                          key,
                          event.target.value
                        )
                      }
                      readOnly={readOnly}
                      required
                      maxLength={
                        emailField
                          ? 320
                          : 100
                      }
                      minH="44px"
                      bg={
                        readOnly
                          ? "#F5F7FC"
                          : "white"
                      }
                      borderColor="#DCE2ED"
                      borderRadius="10px"
                    />
                  </Field.Root>
                );
              })}
            </Flex>

            {!isEdit && (
              <Field.Root mt={4}>
                <Field.Label
                  fontWeight="600"
                  color="#43506C"
                >
                  Account Password
                </Field.Label>

                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    update(
                      "password",
                      event.target.value
                    )
                  }
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  minH="44px"
                  borderColor="#DCE2ED"
                />
              </Field.Root>
            )}

            {isEdit && (
              <Text
                mt={4}
                p={3}
                bg="#F5F7FC"
                borderRadius="9px"
                fontSize="sm"
                color="#66728D"
              >
                First Name and Last Name can be
                updated. Email changes require
                a separate Clerk verification
                workflow.
              </Text>
            )}
          </Box>

          <Box
            h="1px"
            bg="#E8ECF4"
          />

          {/* PERSONAL INFORMATION */}

          <Box>
            <Heading
              size="md"
              color="#192968"
              mb={2}
            >
              02 — Personal Information
            </Heading>

            <Text
              fontSize="sm"
              color="#74809A"
              mb={5}
            >
              Personal details and contact information
            </Text>

            <Flex
              gap={4}
              flexWrap="wrap"
            >
              {personalFields.map(
                ([key, title]) => (
                  <Field.Root
                    key={key}
                    flex="1"
                    minW={{
                      base: "100%",
                      sm: "240px",
                    }}
                  >
                    <Field.Label
                      color="#43506C"
                      fontWeight="600"
                    >
                      {title}
                    </Field.Label>

                    <Input
                      value={form[key]}
                      onChange={(event) =>
                        update(
                          key,
                          event.target.value
                        )
                      }
                      type={
                        key === "age"
                          ? "number"
                          : key ===
                              "dateOfBirth"
                            ? "date"
                            : "text"
                      }
                      required={!isEdit}
                      min={
                        key === "age"
                          ? 1
                          : undefined
                      }
                      max={
                        key === "age"
                          ? 120
                          : key ===
                              "dateOfBirth"
                            ? new Date()
                                .toISOString()
                                .slice(0, 10)
                            : undefined
                      }
                      minH="44px"
                      bg="white"
                      borderColor="#DCE2ED"
                      borderRadius="10px"
                    />
                  </Field.Root>
                )
              )}
            </Flex>

            <Field.Root mt={4}>
              <Field.Label
                color="#43506C"
                fontWeight="600"
              >
                Gender
              </Field.Label>

              <NativeSelect.Root>
                <NativeSelect.Field
                  value={form.gender}
                  onChange={(event) =>
                    update(
                      "gender",
                      event.target.value
                    )
                  }
                  minH="44px"
                  bg="white"
                  borderColor="#DCE2ED"
                >
                  <option value="male">
                    Male
                  </option>
                  <option value="female">
                    Female
                  </option>
                  <option value="other">
                    Other
                  </option>
                </NativeSelect.Field>

                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          </Box>

          {/* MATRICULATION SCORES */}

          {isStudent && (
            <>
              <Box
                h="1px"
                bg="#E8ECF4"
              />

              <Box>
                <Flex
                  justify="space-between"
                  align="center"
                  gap={3}
                  flexWrap="wrap"
                  mb={5}
                >
                  <Box>
                    <Heading
                      size="md"
                      color="#192968"
                    >
                      03 — Matriculation Scores
                    </Heading>

                    <Text
                      fontSize="sm"
                      color="#74809A"
                      mt={1}
                    >
                      Subject names and examination scores
                    </Text>
                  </Box>

                  <Button
                    type="button"
                    variant="outline"
                    color="#253783"
                    disabled={
                      form.matriculationScores
                        .length >= 30
                    }
                    onClick={addScore}
                  >
                    + Add Subject
                  </Button>
                </Flex>

                <VStack
                  align="stretch"
                  gap={3}
                >
                  {form.matriculationScores.map(
                    (score, index) => (
                      <Flex
                        key={index}
                        gap={3}
                        align="end"
                        flexWrap="wrap"
                        p={4}
                        bg="#F8F9FD"
                        border="1px solid #E6EAF3"
                        borderRadius="12px"
                      >
                        <Field.Root
                          flex="2"
                          minW="180px"
                        >
                          <Field.Label>
                            Subject
                          </Field.Label>

                          <Input
                            value={
                              score.subject
                            }
                            required
                            maxLength={100}
                            onChange={(event) =>
                              updateScore(
                                index,
                                "subject",
                                event.target.value
                              )
                            }
                            bg="white"
                          />
                        </Field.Root>

                        <Field.Root
                          flex="1"
                          minW="120px"
                        >
                          <Field.Label>
                            Score
                          </Field.Label>

                          <Input
                            type="number"
                            value={score.score}
                            required
                            min={0}
                            max={100}
                            step="any"
                            onChange={(event) =>
                              updateScore(
                                index,
                                "score",
                                event.target.value
                              )
                            }
                            bg="white"
                          />
                        </Field.Root>

                        <Button
                          type="button"
                          variant="outline"
                          colorPalette="red"
                          onClick={() =>
                            removeScore(index)
                          }
                        >
                          Remove
                        </Button>
                      </Flex>
                    )
                  )}
                </VStack>
              </Box>
            </>
          )}

          {/* FORM ACTIONS */}

          <Flex
            justify="flex-end"
            gap={3}
            flexWrap="wrap"
            pt={5}
            borderTop="1px solid #E8ECF4"
          >
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() =>
                navigate(
                  `/acc/auth/${resource}`
                )
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              bg="#253783"
              color="white"
              loading={saving}
              disabled={
                isEdit && !profileId
              }
              _hover={{
                bg: "#30458F",
              }}
            >
              {isEdit
                ? "Save Changes"
                : `Create ${label}`}
            </Button>
          </Flex>
        </VStack>
      </Box>
    </VStack>
  );
}
