
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";

import { entranceService } from "../../services/entrance.service.js";

const emptyForm = () => ({
  applicantNumber: "",
  firstName: "",
  lastName: "",
  nationalId: "",
  fatherName: "",
  admissionStatus: "pending",
  displayOrder: 1,
});

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Request failed.";

const statuses = [
  "pending",
  "admitted",
  "rejected",
  "waitlisted",
];

export default function EntranceApplicants({ list, onBack }) {
  const editable = list.status === "draft";

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadApplicants = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await entranceService.getApplicants(
        list._id,
        { page, limit }
      );

      setItems(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [list._id, page]);

  useEffect(() => {
    loadApplicants();
  }, [loadApplicants]);

  const change = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openCreate = () => {
    if (!editable) return;

    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setMessage("");
    setFormOpen(true);
  };

  const openEdit = (applicant) => {
    if (!editable) return;

    setEditingId(applicant._id);

    setForm({
      applicantNumber: applicant.applicantNumber ?? "",
      firstName: applicant.firstName ?? "",
      lastName: applicant.lastName ?? "",
      nationalId: applicant.nationalId ?? "",
      fatherName: applicant.fatherName ?? "",
      admissionStatus: applicant.admissionStatus ?? "pending",
      displayOrder: applicant.displayOrder ?? 1,
    });

    setError("");
    setMessage("");
    setFormOpen(true);
  };

  const saveApplicant = async (event) => {
    event.preventDefault();
    if (busy || !editable) return;

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      nationalId: form.nationalId.trim(),
      fatherName: form.fatherName.trim(),
      admissionStatus: form.admissionStatus,
      displayOrder: Number(form.displayOrder),
    };

    if (
      !payload.firstName ||
      !payload.lastName ||
      !payload.nationalId ||
      !payload.fatherName ||
      !Number.isInteger(payload.displayOrder) ||
      payload.displayOrder < 1
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (!editingId && !form.applicantNumber.trim()) {
      setError("Applicant Number is required.");
      return;
    }

    if (
      payload.firstName.length > 100 ||
      payload.lastName.length > 100 ||
      payload.nationalId.length > 100 ||
      payload.fatherName.length > 200 ||
      (!editingId && form.applicantNumber.trim().length > 60)
    ) {
      setError("One or more fields exceed the allowed length.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await entranceService.updateApplicant(
          list._id,
          editingId,
          payload
        );
        setMessage("Applicant updated successfully.");
      } else {
        await entranceService.createApplicant(list._id, {
          applicantNumber: form.applicantNumber.trim(),
          ...payload,
        });
        setMessage("Applicant created successfully.");
      }

      setFormOpen(false);
      setEditingId(null);

      if (!editingId && page !== 1) {
        setPage(1);
      } else {
        await loadApplicants();
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteApplicant = async (applicant) => {
    if (!editable || busy) return;

    if (
      !window.confirm(
        `Delete applicant ${applicant.applicantNumber}? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await entranceService.deleteApplicant(
        list._id,
        applicant._id
      );

      setMessage("Applicant deleted.");

      if (items.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await loadApplicants();
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <VStack align="stretch" gap={5}>
      <Flex justify="space-between" align="center" gap={3} wrap="wrap">
        <Box>
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back to Entrance Lists
          </Button>

          <Heading size="md" mt={3}>
            Applicants — {list.title}
          </Heading>

          <HStack mt={2}>
            <Badge colorPalette={editable ? "gray" : "green"}>
              {list.status}
            </Badge>
            <Text color="fg.muted" fontSize="sm">
              Total: {total}
            </Text>
          </HStack>
        </Box>

        <HStack>
          {editable && (
            <Button
              colorPalette="blue"
              disabled={busy}
              onClick={openCreate}
            >
              Add Applicant
            </Button>
          )}

          <Button
            variant="outline"
            disabled={busy || loading}
            onClick={loadApplicants}
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {!editable && (
        <Box borderWidth="1px" borderRadius="md" p={3}>
          <Text fontSize="sm">
            This list is {list.status}. Applicant records are
            read-only.
          </Text>
        </Box>
      )}

      {error && <Text color="red.500">{error}</Text>}
      {message && <Text color="green.600">{message}</Text>}

      {formOpen && editable && (
        <Box
          as="form"
          onSubmit={saveApplicant}
          borderWidth="1px"
          borderRadius="lg"
          p={5}
        >
          <VStack align="stretch" gap={4}>
            <Heading size="sm">
              {editingId ? "Edit Applicant" : "Add Applicant"}
            </Heading>

            <Field.Root required>
              <Field.Label>Applicant Number</Field.Label>
              <Input
                value={form.applicantNumber}
                disabled={Boolean(editingId)}
                maxLength={60}
                required
                onChange={(event) =>
                  change("applicantNumber", event.target.value)
                }
              />
            </Field.Root>

            {[
              ["firstName", "First Name", 100],
              ["lastName", "Last Name", 100],
              ["nationalId", "NRC Number", 100],
              ["fatherName", "Father Name", 200],
            ].map(([key, label, maxLength]) => (
              <Field.Root key={key} required>
                <Field.Label>{label}</Field.Label>
                <Input
                  value={form[key]}
                  required
                  maxLength={maxLength}
                  onChange={(event) =>
                    change(key, event.target.value)
                  }
                />
              </Field.Root>
            ))}

            <Field.Root>
              <Field.Label>Admission Status</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={form.admissionStatus}
                  onChange={(event) =>
                    change("admissionStatus", event.target.value)
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label>Display Order</Field.Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={form.displayOrder}
                onChange={(event) =>
                  change("displayOrder", event.target.value)
                }
              />
            </Field.Root>

            <HStack justify="flex-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                colorPalette="blue"
                loading={busy}
              >
                {editingId ? "Save Changes" : "Create Applicant"}
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {loading ? (
        <HStack justify="center" py={10}>
          <Spinner />
          <Text>Loading applicants...</Text>
        </HStack>
      ) : items.length === 0 ? (
        <Box p={6} borderWidth="1px" borderRadius="lg">
          <Text>No applicants found.</Text>
        </Box>
      ) : (
        <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>No</Table.ColumnHeader>
                <Table.ColumnHeader>Applicant No.</Table.ColumnHeader>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>NRC</Table.ColumnHeader>
                <Table.ColumnHeader>Father Name</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                {editable && (
                  <Table.ColumnHeader>Actions</Table.ColumnHeader>
                )}
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {items.map((applicant, index) => (
                <Table.Row key={applicant._id}>
                  <Table.Cell>
                    {(page - 1) * limit + index + 1}
                  </Table.Cell>
                  <Table.Cell>
                    {applicant.applicantNumber}
                  </Table.Cell>
                  <Table.Cell>
                    {applicant.firstName} {applicant.lastName}
                  </Table.Cell>
                  <Table.Cell>
                    {applicant.nationalId || "—"}
                  </Table.Cell>
                  <Table.Cell>
                    {applicant.fatherName}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      colorPalette={
                        applicant.admissionStatus === "admitted"
                          ? "green"
                          : applicant.admissionStatus === "rejected"
                          ? "red"
                          : "gray"
                      }
                    >
                      {applicant.admissionStatus}
                    </Badge>
                  </Table.Cell>

                  {editable && (
                    <Table.Cell>
                      <HStack>
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={busy}
                          onClick={() => openEdit(applicant)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          colorPalette="red"
                          variant="outline"
                          disabled={busy}
                          onClick={() => deleteApplicant(applicant)}
                        >
                          Delete
                        </Button>
                      </HStack>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      <HStack justify="space-between">
        <Text fontSize="sm">
          Page {page} of {totalPages}
        </Text>

        <HStack>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </HStack>
      </HStack>
    </VStack>
  );
}
