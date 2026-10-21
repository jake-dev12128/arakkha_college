
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Badge,
  Box,
  Button,
  Dialog,
  Drawer,
  Field,
  Flex,
  Heading,
  Input,
  NativeSelect,
  Spinner,
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";

import {
  academicService,
  getAcademicApiErrorMessage,
} from "../../services/academic.service.js";

import ManagementToolbar from "../../components/dashboard/ManagementToolbar.jsx";

import CurriculumSemesterEditor, {
  validateCurriculumSemesters,
} from "../../components/dashboard/academic/CurriculumSemesterEditor.jsx";

// ==================================================
// CONFIGURATION
// ==================================================

const RESOURCE_LABELS = {
  programs: "Programs",
  courses: "Courses",
  curricula: "Curricula",
  "academic-years": "Academic Years",
  cohorts: "Cohorts",
  "program-enrollments": "Program Enrollments",
};

const STATUS_FILTER_OPTIONS = {
  programs: ["all", "active", "inactive"],
  courses: ["all", "active", "inactive"],
  curricula: ["all", "draft", "published", "archived"],
  "academic-years": ["all", "planned", "active", "completed"],
  cohorts: ["all", "planned", "active", "completed", "cancelled"],
  "program-enrollments": ["all", "active", "suspended", "completed", "withdrawn"],
};

const SEARCHABLE = new Set([
  "programs",
  "courses",
  "curricula",
  "academic-years",
  "cohorts",
  "program-enrollments",
]);

const ARCHIVABLE = new Set([
  "programs",
  "courses",
  "curricula",
]);
// ==================================================
// ACADEMIC RECORD ACTION PERMISSIONS
// ==================================================

const canEditRecord = (resource, record) => {
  switch (resource) {
    case "academic-years":
  return (
    record.status === "planned" &&
    record.isActive !== false
  );
    case "curricula":
      return record.status === "draft";

    case "programs":
    case "courses":
      return record.isActive !== false;

    case "program-enrollments":
      return true;

    default:
      return true;
  }
};

const canArchiveRecord = (resource, record) => {
  if (!ARCHIVABLE.has(resource)) {
    return false;
  }

  if (resource === "curricula") {
    return record.status !== "archived";
  }

  return record.isActive !== false;
};

const canPublishRecord = (resource, record) =>
  resource === "curricula" &&
  record.status === "draft";

const canCloneCurriculum = (resource, record) =>
  resource === "curricula" &&
  record.status === "published";
const DATE_FIELDS = new Set([
  "effectiveFrom",
  "startDate",
  "endDate",
]);

const NUMBER_FIELDS = new Set([
  "durationYears",
  "semestersPerYear",
  "credits",
  "lectureHours",
  "practicalHours",
  "capacity",
]);

const HIDDEN_DETAILS_FIELDS = new Set([
  "_id",
  "id",
  "__v",
  "createdAt",
  "updatedAt",
]);

const DETAIL_REFERENCE_FIELDS = {
  program: "programs",
  curriculum: "curricula",
  academicYear: "academic-years",
  cohort: "cohorts",
};

// ==================================================
// FIELD CONFIGURATION
// ==================================================

const FIELD_CONFIG = {
  programs: [
    {
      name: "code",
      label: "Program Code",
      required: true,
    },
    {
      name: "name",
      label: "Program Name",
      required: true,
    },
    {
      name: "type",
      label: "Program Type",
      type: "select",
      options: [
        ["degree", "Degree"],
        ["diploma", "Diploma"],
        ["certificate", "Certificate"],
        ["professional", "Professional"],
      ],
    },
    {
      name: "durationYears",
      label: "Duration (Years)",
    },
    {
      name: "semestersPerYear",
      label: "Semesters Per Year",
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
    },
    {
      name: "imageUrl",
      label: "Image URL",
    },
  ],

  courses: [
    {
      name: "code",
      label: "Course Code",
      required: true,
    },
    {
      name: "title",
      label: "Course Title",
      required: true,
    },
    {
      name: "credits",
      label: "Credits",
    },
    {
      name: "lectureHours",
      label: "Lecture Hours",
    },
    {
      name: "practicalHours",
      label: "Practical Hours",
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
    },
    {
      name: "prerequisites",
      label: "Prerequisites",
      type: "multi-reference",
      resource: "courses",
    },
  ],

  curricula: [
    {
      name: "program",
      label: "Program",
      type: "reference",
      resource: "programs",
      required: true,
    },
    {
      name: "version",
      label: "Curriculum Version",
      required: true,
    },
    {
      name: "effectiveFrom",
      label: "Effective From",
    },
    {
      name: "semesters",
      label: "Semester Structure",
      type: "semester-editor",
    },
  ],

  "academic-years": [
  {
    name: "code",
    label: "Academic Year Code",
    required: true,
  },
  {
    name: "name",
    label: "Academic Year Name",
    required: true,
  },
  {
    name: "startDate",
    label: "Start Date",
    required: true,
  },
  {
    name: "endDate",
    label: "End Date",
    required: true,
  },
],

  cohorts: [
    {
      name: "code",
      label: "Cohort Code",
      required: true,
    },
    {
      name: "name",
      label: "Cohort Name",
      required: true,
    },
    {
      name: "program",
      label: "Program",
      type: "reference",
      resource: "programs",
      required: true,
    },
    {
      name: "curriculum",
      label: "Curriculum",
      type: "reference",
      resource: "curricula",
      required: true,
    },
    {
      name: "academicYear",
      label: "Academic Year",
      type: "reference",
      resource: "academic-years",
      required: true,
    },
    {
      name: "capacity",
      label: "Capacity",
    },
    {
      name: "startDate",
      label: "Start Date",
    },
    {
      name: "endDate",
      label: "End Date",
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        ["planned", "Planned"],
        ["active", "Active"],
        ["completed", "Completed"],
        ["cancelled", "Cancelled"],
      ],
    },
  ],

  "program-enrollments": [
  {
    name: "studentId",
    label: "Student ID",
    required: true,
  },
  {
    name: "cohort",
    label: "Cohort",
    type: "reference",
    resource: "cohorts",
    required: true,
  },
  {
    name: "status",
    label: "Enrollment Status",
    type: "select",
    options: [
      ["active", "Active"],
      ["suspended", "Suspended"],
      ["completed", "Completed"],
      ["withdrawn", "Withdrawn"],
    ],
  },
  {
    name: "notes",
    label: "Notes",
    type: "textarea",
  },
],
};

// ==================================================
// EDITABLE FIELDS
// ==================================================

const EDITABLE_FIELDS = {
  programs: [
    "name",
    "description",
    "type",
    "durationYears",
    "semestersPerYear",
    "imageUrl",
  ],
  courses: [
    "title",
    "description",
    "credits",
    "lectureHours",
    "practicalHours",
    "prerequisites",
  ],
  curricula: [
    "effectiveFrom",
    "semesters",
  ],
 "academic-years": [
  "name",
  "startDate",
  "endDate",
],
  cohorts: [
    "name",
    "capacity",
    "startDate",
    "endDate",
    "description",
    "status",
  ],
 "program-enrollments": [
  "status",
  "notes",
],
};

// ==================================================
// DEFAULT VALUES
// ==================================================

const DEFAULT_VALUES = {
  programs: {
    code: "",
    name: "",
    type: "diploma",
    durationYears: 2,
    semestersPerYear: 2,
    description: "",
    imageUrl: "",
  },

  courses: {
    code: "",
    title: "",
    credits: 3,
    lectureHours: 0,
    practicalHours: 0,
    description: "",
    prerequisites: [],
  },

  curricula: {
    program: "",
    version: "",
    effectiveFrom: "",
    semesters: [],
  },
"academic-years": {
  code: "",
  name: "",
  startDate: "",
  endDate: "",
},
  cohorts: {
    code: "",
    name: "",
    program: "",
    curriculum: "",
    academicYear: "",
    capacity: "",
    status: "planned",
    startDate: "",
    endDate: "",
    description: "",
  },

  "program-enrollments": {
  studentId: "",
  cohort: "",
  notes: "",
},
};

// ==================================================
// HELPERS
// ==================================================

const getId = (value) => {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    return value._id ?? value.id ?? "";
  }

  return "";
};

const getRecordTitle = (record) =>
  record?.name ||
  record?.title ||
  record?.code ||
  record?.version ||
  record?.student?.studentId ||
  record?.studentId ||
  "Untitled";

const getOptionLabel = (record) => {
  if (!record) return "Unknown";

  const code = record.code
    ? `${record.code} — `
    : "";

  return (
    code +
    (record.name ||
      record.title ||
      record.version ||
      record.studentId ||
      "Unnamed Record")
  );
};

const getReferenceLabel = (record, resourceName) => {
  if (!record) return "—";

  if (resourceName === "curricula") {
    const version =
      record.version || "Unnamed Curriculum";

    const programName =
      typeof record.program === "object"
        ? record.program?.name
        : null;

    return programName
      ? `${version} — ${programName}`
      : `Curriculum ${version}`;
  }

  if (resourceName === "academic-years") {
    return (
      record.name ||
      record.code ||
      "Unnamed Academic Year"
    );
  }

  if (resourceName === "programs") {
    return (
      record.name ||
      record.code ||
      "Unnamed Program"
    );
  }

  if (resourceName === "cohorts") {
    return (
      record.name ||
      record.code ||
      "Unnamed Cohort"
    );
  }

  return getOptionLabel(record);
};

const toDateInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const toFormValue = (name, value) => {
  if (DATE_FIELDS.has(name)) {
    return toDateInput(value);
  }

  if (name === "prerequisites") {
    return Array.isArray(value)
      ? value.map(getId)
      : [];
  }

  if (name === "semesters") {
    return Array.isArray(value)
      ? value
      : [];
  }

  if (value && typeof value === "object") {
    return getId(value);
  }

  return value ?? "";
};

const formatValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length
      ? value.map(formatValue).join(", ")
      : "None";
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.title ||
      value.code ||
      value.version ||
      value.studentId ||
      "—"
    );
  }

  return String(value);
};

const displayFieldName = (name) =>
  name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) =>
      character.toUpperCase(),
    );

const extractRecords = (result) => {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.records)) {
    return result.records;
  }

  if (Array.isArray(result?.users)) {
    return result.users;
  }

  return [];
};

const getError = (error) =>
  getAcademicApiErrorMessage(
    error,
    error?.message ||
      "The request could not be completed.",
  );

const isAbortError = (error) =>
  error?.name === "AbortError" ||
  error?.name === "CanceledError" ||
  error?.code === "ERR_CANCELED";

// ==================================================
// RESOURCE-SPECIFIC TABLES AND DETAILS
// ==================================================

const getRelatedLabel = (value, fallback = "—") => {
  if (!value) return fallback;
  if (typeof value === "string") {
    return /^[a-f\d]{24}$/i.test(value) ? fallback : value;
  }
  return (
    value.name || value.title || value.code ||
    value.studentId || value.version || fallback
  );
};

const getStudent = (record) =>
  record.student || record.studentProfile || null;

const getStudentIdLabel = (record) => {
  const id = record.studentId;
  if (typeof id === "string") return id;
  if (id && typeof id === "object") return id.studentId || "—";
  return getStudent(record)?.studentId || "—";
};

const getStudentName = (record) => {
  const student = getStudent(record);
  if (!student || typeof student !== "object") return "—";
  const fullName = [
    student.firstName ?? student.firstname,
    student.lastName ?? student.lastname,
  ].filter(Boolean).join(" ");
  return fullName || student.name || "—";
};

const getProgramFromEnrollment = (record) =>
  record.program || record.cohort?.program;

const resolveFromReferences = (value, resourceName, references = {}) => {
  if (value && typeof value === "object") return getRelatedLabel(value);
  const found = (references[resourceName] ?? []).find((item) => getId(item) === value);
  return found ? getRelatedLabel(found) : getRelatedLabel(value);
};

const getStatus = (record) => {
  if (record.status) {
    return record.status;
  }

  if (typeof record.isActive === "boolean") {
    if (!record.isActive) {
      return "archived";
    }

    if (record.isPublished) {
      return "published";
    }

    return "draft";
  }

  return "—";
};
const getStatusPalette = (status) => ({
  active: "green", published: "green", completed: "blue",
  planned: "gray", draft: "gray", suspended: "orange",
  cancelled: "red", withdrawn: "red", archived: "gray",
})[String(status).toLowerCase()] || "gray";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      });
};

const getSemesterCount = (record) =>
  Array.isArray(record.semesters) ? record.semesters.length : "—";

const getSeatCount = (record) => {
  const occupied = record.occupiedSeats;
  const capacity = record.capacity;
  if (occupied == null && capacity == null) return "—";
  return `${occupied ?? "—"} / ${capacity ?? "Unlimited"}`;
};

const TABLE_COLUMNS = {
  programs: [
    { label: "Code", value: (r) => r.code },
    { label: "Program Name", value: (r) => r.name },
    { label: "Type", value: (r) => r.type },
    { label: "Duration", value: (r) => r.durationYears == null ? "—" : `${r.durationYears} years` },
    { label: "Status", status: true },
  ],
  courses: [
    { label: "Code", value: (r) => r.code },
    { label: "Course Title", value: (r) => r.title },
    { label: "Credits", value: (r) => r.credits },
    { label: "Lecture Hours", value: (r) => r.lectureHours },
    { label: "Practical Hours", value: (r) => r.practicalHours },
  ],
  curricula: [
    { label: "Program", value: (r, refs) => resolveFromReferences(r.program, "programs", refs) },
    { label: "Version", value: (r) => r.version },
    { label: "Semesters", value: getSemesterCount },
    { label: "Effective From", value: (r) => formatDate(r.effectiveFrom) },
    { label: "Status", status: true },
  ],
  "academic-years": [
    { label: "Code", value: (r) => r.code },
    { label: "Academic Year", value: (r) => r.name },
    { label: "Start Date", value: (r) => formatDate(r.startDate) },
    { label: "End Date", value: (r) => formatDate(r.endDate) },
    { label: "Status", status: true },
  ],
  cohorts: [
    { label: "Cohort", value: (r) => r.code || r.name },
    { label: "Program", value: (r, refs) => resolveFromReferences(r.program, "programs", refs) },
    { label: "Academic Year", value: (r, refs) => resolveFromReferences(r.academicYear, "academic-years", refs) },
    { label: "Seats", value: getSeatCount },
    { label: "Status", status: true },
  ],
  "program-enrollments": [
    { label: "Student ID", value: getStudentIdLabel },
    { label: "Student Name", value: getStudentName },
    { label: "Program", value: (r, refs) => getRelatedLabel(getProgramFromEnrollment(r) || (refs.cohorts ?? []).find(c => getId(c) === getId(r.cohort))?.program) },
    { label: "Cohort", value: (r, refs) => resolveFromReferences(r.cohort, "cohorts", refs) },
    { label: "Enrolled Date", value: (r) => formatDate(r.enrolledAt || r.createdAt) },
    { label: "Status", status: true },
  ],
};

const DETAIL_GROUPS = {
  programs: [
  {
    title: "Program Information",
    fields: [
      "code",
      "name",
      "slug",
      "type",
      "durationYears",
      "semestersPerYear",
      "description",
      "imageUrl",
      "status",
      "publishedAt",
      "lastPublishedAt",
    ],
  },
],
  courses: [
    { title: "Course Information", fields: ["code", "title", "credits", "lectureHours", "practicalHours", "description", "prerequisites"] },
  ],
  curricula: [
    { title: "Curriculum Information", fields: ["program", "version", "effectiveFrom", "status", "isPublished"] },
    { title: "Semester Structure", fields: ["semesters"] },
  ],
  "academic-years": [
    { title: "Academic Year Information", fields: ["code", "name", "startDate", "endDate", "status"] },
  ],
  cohorts: [
    { title: "Cohort Information", fields: ["code", "name", "program", "curriculum", "academicYear", "status", "description"] },
    { title: "Schedule and Capacity", fields: ["startDate", "endDate", "capacity", "occupiedSeats", "availableSeats"] },
  ],
  "program-enrollments": [
    { title: "Student Information", fields: ["studentId", "studentName"] },
    { title: "Academic Information", fields: ["program", "cohort", "academicYear", "curriculum"] },
    { title: "Enrollment Information", fields: ["status", "enrolledAt", "createdAt", "notes"] },
  ],
};

// ==================================================
// COMPONENT
// ==================================================

export default function AcademicManagement({
  resource,
}) {
  // ==================================================
  // STATE
  // ==================================================

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({});

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  // Search automatically after typing stops; cancel pending requests on changes.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const nextQuery = search.trim();
      setPage(1);
      setQuery(nextQuery);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [search]);
  const [statusFilters, setStatusFilters] = useState({});
  const selectedStatus = statusFilters[resource] ?? "all";
  const changeStatus = (value) => {
    setPage(1);
    setStatusFilters((previous) => ({ ...previous, [resource]: value }));
  };
  const [yearSummary, setYearSummary] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [references, setReferences] = useState({});
  const [referenceError, setReferenceError] =
    useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});

  const [detailsOpen, setDetailsOpen] =
    useState(false);

  const [detailsRecord, setDetailsRecord] =
    useState(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState("");

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  const [deleteRecord, setDeleteRecord] =
    useState(null);

  const [eligibility, setEligibility] =
    useState(null);

  const [
    eligibilityLoading,
    setEligibilityLoading,
  ] = useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  const [confirmation, setConfirmation] =
    useState("");

  // Academic year lifecycle confirmation
  const [lifecycleDialog, setLifecycleDialog] = useState(null);
  const [lifecycleSaving, setLifecycleSaving] = useState(false);
  const [lifecycleError, setLifecycleError] = useState("");

// ==================================================
// CLONE CURRICULUM STATE
// ==================================================

const [cloneOpen, setCloneOpen] = useState(false);
const [cloneSource, setCloneSource] = useState(null);

const [cloneVersion, setCloneVersion] = useState("");
const [cloneEffectiveFrom, setCloneEffectiveFrom] =
  useState("");

const [cloneSaving, setCloneSaving] = useState(false);
const [cloneError, setCloneError] = useState("");
  const fields = useMemo(
    () => FIELD_CONFIG[resource] ?? [],
    [resource],
  );

  const title =
    RESOURCE_LABELS[resource] ??
    "Academic Management";

  // ==================================================
  // LOAD RECORDS
  // ==================================================

  const loadRecords = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        if (resource === "academic-years") {
          // Fetch all pages: pagination.total alone cannot provide status totals.
          // Keep this behavior limited to academic years.
          const all = [];
          const limit = 100;
          let currentPage = 1;
          let totalPages = 1;

          do {
            const result = await academicService.list(
              resource,
              { page: currentPage, limit },
              signal,
            );
            if (signal?.aborted) return;

            const batch = extractRecords(result);
            all.push(...batch);
            const reportedPages = Number(result?.pagination?.totalPages);
            const reportedTotal = Number(result?.pagination?.total);
            totalPages = Number.isFinite(reportedPages) && reportedPages >= 1
              ? reportedPages
              : Number.isFinite(reportedTotal) && reportedTotal >= 0
                ? Math.max(1, Math.ceil(reportedTotal / limit))
                : (batch.length === limit ? currentPage + 1 : currentPage);
            currentPage += 1;
          } while (currentPage <= totalPages);

          const active = all.filter((item) =>
            item.status === "active" && item.isActive !== false
          );
          const planned = all.filter((item) => item.status === "planned");
          const completed = all.filter((item) => item.status === "completed");

          const normalizedQuery = query.trim().toLowerCase();
          const filtered = all.filter((item) => {
            const matchesStatus = selectedStatus === "all" ||
              item.status === selectedStatus;
            const matchesSearch = !normalizedQuery ||
              [item.code, item.name].some((value) =>
                String(value ?? "").toLowerCase().includes(normalizedQuery)
              );
            return matchesStatus && matchesSearch;
          });

          const total = filtered.length;
          const filteredPages = Math.max(1, Math.ceil(total / 20));
          const safePage = Math.min(page, filteredPages);
          if (safePage !== page) setPage(safePage);

          if (signal?.aborted) return;
          setYearSummary({
            total: all.length,
            active: active.length,
            activeYear: active[0] ?? null,
            planned: planned.length,
            completed: completed.length,
          });
          setRecords(filtered.slice((safePage - 1) * 20, safePage * 20));
          setPagination({ page: safePage, limit: 20, total, totalPages: filteredPages });
          return;
        }

        const params = { page, limit: 20 };
        if (query.trim() && SEARCHABLE.has(resource)) {
          params.search = query.trim();
        }
        if (selectedStatus !== "all") {
          params.status = selectedStatus;
        }
        const result = await academicService.list(resource, params, signal);
        if (signal?.aborted) return;
        setYearSummary(null);
        setRecords(extractRecords(result));
        setPagination(result?.pagination ?? {});
      } catch (err) {
        if (!isAbortError(err) && !signal?.aborted) {
          setError(getError(err));
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
[resource, page, query, selectedStatus],
  );

  useEffect(() => {
    const controller =
      new AbortController();

    loadRecords(controller.signal);

    return () =>
      controller.abort();
  }, [loadRecords]);

  // ==================================================
  // LOAD REFERENCE OPTIONS
  // ==================================================

  useEffect(() => {
    const controller =
      new AbortController();

    const referenceResources = [
      ...new Set([
        ...fields
          .filter(
            (field) =>
              field.type === "reference" ||
              field.type ===
                "multi-reference",
          )
          .map(
            (field) =>
              field.resource,
          ),

        ...(resource === "curricula"
          ? ["courses"]
          : []),

        ...(resource === "cohorts"
          ? [
              "programs",
              "curricula",
              "academic-years",
            ]
          : []),

        ...(resource ===
        "program-enrollments"
          ? ["cohorts"]
          : []),
      ]),
    ];

    if (!referenceResources.length) {
      setReferences({});
      return () =>
        controller.abort();
    }

    const loadReferences = async () => {
      setReferenceError("");

      try {
        const entries =
          await Promise.all(
            referenceResources.map(
              async (name) => {
                const result =
                  await academicService.list(
                    name,
                    {
                      page: 1,
                      limit: 100,
                    },
                    controller.signal,
                  );

                return [
                  name,
                  extractRecords(result),
                ];
              },
            ),
          );

        if (
          !controller.signal.aborted
        ) {
          setReferences(
            Object.fromEntries(entries),
          );
        }
      } catch (err) {
        if (
          !isAbortError(err) &&
          !controller.signal.aborted
        ) {
          setReferenceError(
            getError(err),
          );
        }
      }
    };

    loadReferences();

    return () =>
      controller.abort();
  }, [resource, fields]);

  // ==================================================
  // DEPENDENT CURRICULUM OPTIONS
  // ==================================================

  const curriculumOptions =
    useMemo(() => {
      const all =
        references.curricula ?? [];

      if (
        resource !== "cohorts" ||
        !form.program
      ) {
        return all;
      }

      return all.filter(
        (item) =>
          getId(item.program) ===
          getId(form.program),
      );
    }, [
      references.curricula,
      resource,
      form.program,
    ]);

  // ==================================================
  // RESOLVE DETAIL VALUES
  // ==================================================

  const resolveDetailValue = (
    key,
    value,
  ) => {
    const referenceResource =
      DETAIL_REFERENCE_FIELDS[key];

    if (!referenceResource) {
      return formatValue(value);
    }

    if (!value) {
      return "—";
    }

    // Populated backend reference.
    if (
      typeof value === "object" &&
      (
        value.name ||
        value.title ||
        value.version ||
        value.code
      )
    ) {
      return getReferenceLabel(
        value,
        referenceResource,
      );
    }

    // Resolve ObjectId against loaded records.
    const id = getId(value);

    const matchingRecord = (
      references[referenceResource] ?? []
    ).find(
      (item) =>
        getId(item) === id,
    );

    if (matchingRecord) {
      return getReferenceLabel(
        matchingRecord,
        referenceResource,
      );
    }

    return "Reference not available";
  };

  // ==================================================
  // FORM HANDLERS
  // ==================================================

  const startCreate = () => {
    setEditingId(null);

    setForm({
      ...(DEFAULT_VALUES[resource] ?? {}),
    });

    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const startEdit = async (record) => {
  if (!canEditRecord(resource, record)) {
    setError(
      resource === "curricula"
        ? "Published or archived curricula cannot be edited. Clone a published curriculum as a new draft."
        : "This record cannot be edited in its current state."
    );
    return;
  }
    setError("");
    setNotice("");

    try {
      const latest =
        await academicService.getById(
          resource,
          record._id,
        );

      const allowed =
        EDITABLE_FIELDS[resource] ??
        [];

      const values =
        Object.fromEntries(
          allowed
            .filter(
              (name) =>
                latest[name] !==
                undefined,
            )
            .map((name) => [
              name,
              toFormValue(
                name,
                latest[name],
              ),
            ]),
        );

      setEditingId(record._id);
      setForm(values);
      setFormOpen(true);
    } catch (err) {
      setError(getError(err));
    }
  };

  const changeField = (
    name,
    value,
  ) => {
    setForm((previous) => {
      const next = {
        ...previous,
        [name]: value,
      };

      if (
        resource === "cohorts" &&
        name === "program" &&
        value !==
          previous.program
      ) {
        next.curriculum = "";
      }

      return next;
    });
  };

  // ==================================================
  // BUILD PAYLOAD
  // ==================================================

  const buildPayload = () => {
    const allowed = editingId
      ? EDITABLE_FIELDS[resource] ??
        []
      : fields.map(
          (field) =>
            field.name,
        );

    const payload = {};

    for (const name of allowed) {
      // Enrollment status is server-assigned on create.
      if (
        resource === "program-enrollments" &&
        !editingId &&
        name === "status"
      ) {
        continue;
      }

      if (form[name] === undefined) {
        continue;
      }

      let value = form[name];

      if (
        NUMBER_FIELDS.has(name)
      ) {
        if (
          value === "" &&
          name === "capacity"
        ) {
          value = null;
        } else {
          value = Number(value);
        }
      }

      if (
        name === "semesters"
      ) {
        if (
          typeof value ===
          "string"
        ) {
          value =
            JSON.parse(value);
        }

        if (
          !Array.isArray(value)
        ) {
          throw new Error(
            "Semesters must be an array.",
          );
        }
      }

      if (
        name === "prerequisites"
      ) {
        value =
          Array.isArray(value)
            ? value
            : [];
      }

      if (
        value === "" &&
        name === "endDate"
      ) {
        if (editingId) {
          payload[name] = null;
        }
        continue;
      }

      // Do not send blank optional dates or fields.
      if (value === "" && name === "effectiveFrom") {
        continue;
      }

      payload[name] = value;
    }

    return payload;
  };

  // ==================================================
  // SAVE RECORD
  // ==================================================

  const saveRecord = async () => {
    setSaving(true);
    setError("");

    try {
      const payload =
        buildPayload();

      if (resource === "curricula" && !editingId && !payload.effectiveFrom) {
        throw new Error("Effective From date is required.");
      }

      // Validate curriculum structure.
      if (
        resource === "curricula" &&
        payload.semesters !==
          undefined
      ) {
        const validation =
          validateCurriculumSemesters(
            payload.semesters,
          );

        if (
          !validation.valid
        ) {
          throw new Error(
            validation.errors.join(
              "\n",
            ),
          );
        }

        payload.semesters =
          validation.semesters;
      }

      if (editingId) {
        await academicService.update(
          resource,
          editingId,
          payload,
        );
      } else {
        await academicService.create(
          resource,
          payload,
        );
      }

      setFormOpen(false);
      setEditingId(null);

      setNotice(
        "Academic record saved successfully.",
      );

      await loadRecords();
    } catch (err) {
      setError(
        getError(err),
      );
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // OPEN DETAILS
  // ==================================================

  const openDetails = async (
    record,
  ) => {
    setDetailsRecord(null);
    setDetailsError("");
    setDetailsLoading(true);
    setDetailsOpen(true);

    try {
      const result =
        await academicService.getById(
          resource,
          record._id,
        );

      setDetailsRecord(result);
    } catch (err) {
      setDetailsError(
        getError(err),
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  // ==================================================
  // SAFE DELETE ELIGIBILITY
  // ==================================================

  const openDelete = async (
    record,
  ) => {
    setDeleteRecord(record);
    setDeleteOpen(true);
    setDeleteError("");
    setEligibility(null);
    setConfirmation("");
    setEligibilityLoading(true);

    try {
      const result =
        await academicService.getDeleteEligibility(
          resource,
          record._id,
        );

      setEligibility(result);
    } catch (err) {
      setDeleteError(
        getError(err),
      );
    } finally {
      setEligibilityLoading(false);
    }
  };

  // ==================================================
  // CONFIRM SAFE DELETE
  // ==================================================

  const confirmDelete = async () => {
    if (
      !deleteRecord ||
      !eligibility?.canDelete ||
      confirmation !==
        "DELETE" ||
      deleting
    ) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      await academicService.safeDelete(
        resource,
        deleteRecord._id,
      );

      setDeleteOpen(false);
      setDeleteRecord(null);
      setEligibility(null);
      setConfirmation("");

      setNotice(
        "Academic record deleted successfully.",
      );

      await loadRecords();
    } catch (err) {
      setDeleteError(
        getError(err),
      );

      try {
        const latest =
          await academicService.getDeleteEligibility(
            resource,
            deleteRecord._id,
          );

        setEligibility(latest);
      } catch {
        // Keep original error.
      }
    } finally {
      setDeleting(false);
    }
  };
// ==================================================
// OPEN CLONE DIALOG
// ==================================================

const openCloneDialog = (record) => {
  if (record.status !== "published") {
    setError("Only published curricula can be cloned.");
    return;
  }

  setCloneSource(record);
  setCloneVersion("");
  setCloneEffectiveFrom("");
  setCloneError("");
  setCloneOpen(true);
};

// ==================================================
// SUBMIT CLONE
// ==================================================

const submitClone = async () => {
  if (!cloneSource || cloneSaving) return;

  const version = cloneVersion.trim();

  if (!version) {
    setCloneError("New curriculum version is required.");
    return;
  }

  if (!cloneEffectiveFrom) {
    setCloneError("Effective date is required.");
    return;
  }

  setCloneSaving(true);
  setCloneError("");

  try {
    const created = await academicService.cloneCurriculumAsDraft(
      cloneSource._id,
      {
        version,
        effectiveFrom: cloneEffectiveFrom,
      },
    );

    setCloneOpen(false);
    setCloneSource(null);

    setNotice(
      `Curriculum ${created.version || version} cloned as draft successfully.`,
    );

    setError("");

    await loadRecords();
  } catch (err) {
    setCloneError(getAcademicApiErrorMessage(
      err,
      "Failed to clone curriculum.",
    ));
  } finally {
    setCloneSaving(false);
  }
};
  // ==================================================
  // ARCHIVE / PUBLISH
  // ==================================================

  // ==================================================
// ARCHIVE / PUBLISH / UNPUBLISH
// ==================================================

const performAction = async (record, action) => {
  const confirmed = window.confirm(
    `Are you sure you want to ${action} "${getRecordTitle(record)}"?`
  );

  if (!confirmed) {
    return;
  }

  setError("");

  try {
    switch (action) {
      case "publish":
        await academicService.publish(
          resource,
          record._id
        );
        break;

      case "unpublish":
        await academicService.unpublish(
          resource,
          record._id
        );
        break;

      case "archive":
        await academicService.archive(
          resource,
          record._id
        );
        break;

      default:
        throw new Error(
          `Unsupported action: ${action}`
        );
    }

    setNotice(
      `${action} completed successfully.`
    );

    await loadRecords();
  } catch (err) {
    setError(getError(err));
  }
};

  // ==================================================
  // ACADEMIC YEAR LIFECYCLE
  // ==================================================

  const openLifecycleDialog = (record, action) => {
    if (resource !== "academic-years") return;

    const allowed = record.isActive !== false && (
      (action === "activate" && record.status === "planned") ||
      (action === "complete" && record.status === "active")
    );

    if (!allowed) {
      setError("This academic year cannot perform that action.");
      return;
    }

    setLifecycleError("");
    setError("");
    setNotice("");
    setLifecycleDialog({ record, action });
  };

  const closeLifecycleDialog = () => {
    if (lifecycleSaving) return;
    setLifecycleDialog(null);
    setLifecycleError("");
  };

  const confirmLifecycleAction = async () => {
    if (!lifecycleDialog || lifecycleSaving) return;

    const { record, action } = lifecycleDialog;
    setLifecycleSaving(true);
    setLifecycleError("");

    try {
      if (action === "activate") {
        await academicService.activateAcademicYear(record._id);
      } else if (action === "complete") {
        await academicService.completeAcademicYear(record._id);
      } else {
        throw new Error("Unsupported academic year action.");
      }

      setLifecycleDialog(null);
      setNotice(
        `Academic year "${getRecordTitle(record)}" ${
          action === "activate" ? "activated" : "completed"
        } successfully.`
      );
      setError("");
      await loadRecords();
    } catch (err) {
      setLifecycleError(getError(err));
    } finally {
      setLifecycleSaving(false);
    }
  };

  // ==================================================
  // FORM FIELD RENDERER
  // ==================================================

  const renderField = (
    field,
  ) => {
    const {
      name,
      label,
      type,
      required,
    } = field;

    if (
      editingId &&
      !EDITABLE_FIELDS[
        resource
      ]?.includes(name)
    ) {
      return null;
    }

    // Hide enrollment status on creation; editing retains it.
    if (
      resource === "program-enrollments" &&
      !editingId &&
      name === "status"
    ) {
      return null;
    }

    const value =
      form[name] ?? "";

    // TEXTAREA
    if (
      type === "textarea"
    ) {
      return (
        <Field.Root
          key={name}
        >
          <Field.Label>
            {label}
          </Field.Label>

          <Textarea
            value={value}
            rows={4}
            disabled={saving}
            onChange={(event) =>
              changeField(
                name,
                event.target.value,
              )
            }
          />
        </Field.Root>
      );
    }

    // CURRICULUM SEMESTER EDITOR
    if (
      type ===
      "semester-editor"
    ) {
      return (
        <CurriculumSemesterEditor
          key={name}
          value={
            form.semesters ??
            []
          }
          courses={
            references.courses ??
            []
          }
          onChange={(
            nextSemesters,
          ) =>
            changeField(
              "semesters",
              nextSemesters,
            )
          }
          disabled={saving}
        />
      );
    }

    // MULTI REFERENCE
    if (
      type ===
      "multi-reference"
    ) {
      const options =
        references[
          field.resource
        ] ?? [];

      return (
        <Field.Root
          key={name}
        >
          <Field.Label>
            {label}
          </Field.Label>

          <Box
            as="select"
            multiple
            value={
              Array.isArray(value)
                ? value
                : []
            }
            disabled={saving}
            onChange={(
              event,
            ) => {
              const selected =
                Array.from(
                  event.target
                    .selectedOptions,
                  (option) =>
                    option.value,
                );

              changeField(
                name,
                selected,
              );
            }}
            width="100%"
            minH="130px"
            borderWidth="1px"
            borderRadius="md"
            p={2}
            bg="bg"
          >
            {options
              .filter(
                (item) =>
                  item._id !==
                  editingId,
              )
              .map(
                (item) => (
                  <option
                    key={
                      item._id
                    }
                    value={
                      item._id
                    }
                  >
                    {getOptionLabel(
                      item,
                    )}
                  </option>
                ),
              )}
          </Box>

          <Text
            fontSize="xs"
            color="fg.muted"
          >
            Hold Ctrl to
            select multiple
            courses.
          </Text>
        </Field.Root>
      );
    }

    // REFERENCE DROPDOWN
    if (
      type ===
      "reference"
    ) {
      const options =
        name ===
          "curriculum" &&
        resource ===
          "cohorts"
          ? curriculumOptions
          : references[
              field.resource
            ] ?? [];

      return (
        <Field.Root
          key={name}
          required={
            required
          }
        >
          <Field.Label>
            {label}
          </Field.Label>

          <NativeSelect.Root>
            <NativeSelect.Field
              value={
                getId(value)
              }
              disabled={
                saving
              }
              onChange={(
                event,
              ) =>
                changeField(
                  name,
                  event.target.value,
                )
              }
            >
              <option
                value=""
              >
                Select{" "}
                {label}
              </option>

              {options.map(
                (item) => (
                  <option
                    key={
                      item._id
                    }
                    value={
                      item._id
                    }
                  >
                    {getReferenceLabel(
                      item,
                      field.resource,
                    )}
                  </option>
                ),
              )}
            </NativeSelect.Field>

            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      );
    }

    // SELECT
    if (
      type === "select"
    ) {
      return (
        <Field.Root
          key={name}
        >
          <Field.Label>
            {label}
          </Field.Label>

          <NativeSelect.Root>
            <NativeSelect.Field
              value={value}
              disabled={saving}
              onChange={(
                event,
              ) =>
                changeField(
                  name,
                  event.target.value,
                )
              }
            >
              <option
                value=""
              >
                Select{" "}
                {label}
              </option>

              {field.options.map(
                ([
                  optionValue,
                  optionLabel,
                ]) => (
                  <option
                    key={
                      optionValue
                    }
                    value={
                      optionValue
                    }
                  >
                    {
                      optionLabel
                    }
                  </option>
                ),
              )}
            </NativeSelect.Field>

            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      );
    }

    // DEFAULT INPUT
    return (
      <Field.Root
        key={name}
        required={
          required
        }
      >
        <Field.Label>
          {label}
        </Field.Label>

        <Input
          type={
            DATE_FIELDS.has(
              name,
            )
              ? "date"
              : NUMBER_FIELDS.has(
                    name,
                  )
                ? "number"
                : "text"
          }
          value={value}
          disabled={saving}
          onChange={(
            event,
          ) =>
            changeField(
              name,
              event.target.value,
            )
          }
        />
      </Field.Root>
    );
  };

  // ==================================================
  // DETAILS RENDERER
  // ==================================================

  const renderDetails = () => {
    if (!detailsRecord) return null;

    const record = detailsRecord;
    const groups = DETAIL_GROUPS[resource] ?? [];

    const detailValue = (key) => {
      if (key === "studentId") return getStudentIdLabel(record);
      if (key === "studentName") return getStudentName(record);
      if (key === "program" && resource === "program-enrollments") {
        return getRelatedLabel(getProgramFromEnrollment(record));
      }
    if (
  key === "academicYear" &&
  resource === "program-enrollments"
) {
  const academicYear =
    record.cohort?.academicYear;

  if (!academicYear) return "—";

  if (typeof academicYear === "object") {
    return (
      academicYear.name ||
      academicYear.code ||
      "—"
    );
  }

  return resolveFromReferences(
    academicYear,
    "academic-years",
    references
  );
}

if (
  key === "curriculum" &&
  resource === "program-enrollments"
) {
  const curriculum =
    record.cohort?.curriculum;

  if (!curriculum) return "—";

  if (typeof curriculum === "object") {
    return curriculum.version || "—";
  }

  return resolveFromReferences(
    curriculum,
    "curricula",
    references
  );
}
      if (key === "availableSeats") {
        return record.capacity == null ? "—" : Math.max(0, record.capacity - (record.occupiedSeats ?? 0));
      }
      if (
  [
    "startDate",
    "endDate",
    "effectiveFrom",
    "enrolledAt",
    "createdAt",
    "publishedAt",
    "lastPublishedAt",
  ].includes(key)
) {
  return formatDate(record[key]);
}
      if (key === "status") return getStatus(record);
      if (key === "prerequisites" && Array.isArray(record.prerequisites)) {
        return record.prerequisites.length
          ? record.prerequisites.map((course) => getRelatedLabel(course)).join(", ")
          : "None";
      }
      return resolveDetailValue(key, record[key]);
    };

    const renderSemesterStructure = () => {
      const semesters = Array.isArray(record.semesters) ? record.semesters : [];
      if (!semesters.length) return <Text color="fg.muted">No semesters assigned.</Text>;
      return semesters.map((semester, index) => (
        <Box key={semester._id ?? index} borderWidth="1px" borderRadius="lg" p={3}>
          <Text fontWeight="semibold" mb={2}>
            Year {semester.yearNumber ?? "—"} — Semester {semester.semesterNumber ?? "—"}
          </Text>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Course</Table.ColumnHeader>
                <Table.ColumnHeader>Type</Table.ColumnHeader>
                <Table.ColumnHeader>Order</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(semester.courses ?? []).map((entry, entryIndex) => {
                const courseId = getId(entry.course);
                const course = (references.courses ?? []).find((item) => getId(item) === courseId);
                return (
                  <Table.Row key={entry._id ?? entryIndex}>
                    <Table.Cell>{course ? getOptionLabel(course) : getRelatedLabel(entry.course, "Course not available")}</Table.Cell>
                    <Table.Cell>{entry.courseType ?? "Core"}</Table.Cell>
                    <Table.Cell>{entry.order ?? entryIndex + 1}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Box>
      ));
    };

    return (
      <VStack align="stretch" gap={5}>
        {groups.map((group) => (
          <Box key={group.title}>
            <Heading size="sm" mb={3}>{group.title}</Heading>
            <VStack align="stretch" gap={3}>
              {group.fields.map((key) => key === "semesters" ? (
                <VStack key={key} align="stretch" gap={3}>{renderSemesterStructure()}</VStack>
              ) : (
                <Flex key={key} justify="space-between" align="start" gap={4} borderBottomWidth="1px" pb={2}>
                  <Text color="fg.muted" fontSize="sm" minW="120px">{displayFieldName(key)}</Text>
                  <Text textAlign="end" fontSize="sm" overflowWrap="anywhere">{detailValue(key)}</Text>
                </Flex>
              ))}
            </VStack>
          </Box>
        ))}
      </VStack>
    );
  };

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <VStack
      align="stretch"
      gap={5}
    >
      {/* PAGE HEADER */}

      <Flex
        justify="space-between"
        align="center"
        gap={3}
        wrap="wrap"
      >
        <Box>
          <Heading size="lg">
            {title}
          </Heading>

          <Text
            fontSize="sm"
            color="fg.muted"
          >
            Manage academic
            records and
            related information.
          </Text>
        </Box>

        <Button
          onClick={
            startCreate
          }
        >
          + Add New
        </Button>
      </Flex>

      {/* ALERTS */}

      {error && (
        <Box
          role="alert"
          borderWidth="1px"
          borderColor="red.400"
          borderRadius="md"
          p={3}
        >
          <Text
            color="red.500"
            whiteSpace="pre-line"
          >
            {error}
          </Text>
        </Box>
      )}

      {notice && (
        <Box
          role="status"
          borderWidth="1px"
          borderColor="green.400"
          borderRadius="md"
          p={3}
        >
          <Text
            color="green.600"
          >
            {notice}
          </Text>
        </Box>
      )}

      {referenceError && (
        <Text
          color="orange.500"
          fontSize="sm"
        >
          Dropdown data could
          not be loaded:{" "}
          {referenceError}
        </Text>
      )}

      {/* ACADEMIC YEAR SUMMARY */}
      {resource === "academic-years" && (
        <>
          <Flex gap={3} wrap="wrap">
            {[
              { label: "Total Academic Years", value: yearSummary?.total ?? "—" },
              { label: "Active Academic Year", value: yearSummary?.activeYear?.code ?? "None" },
              { label: "Planned Years", value: yearSummary?.planned ?? "—" },
              { label: "Completed Years", value: yearSummary?.completed ?? "—" },
            ].map((item) => (
              <Box
                key={item.label}
                flex="1 1 190px"
                borderWidth="1px"
                borderRadius="lg"
                p={4}
              >
                <Text color="fg.muted" fontSize="sm">{item.label}</Text>
                <Heading size="lg" mt={2}>{loading && !yearSummary ? "…" : item.value}</Heading>
              </Box>
            ))}
          </Flex>
          {yearSummary?.active > 1 && (
            <Text role="alert" color="red.500">
              Data integrity warning: multiple active academic years were returned.
            </Text>
          )}

        </>
      )}

      {/* Unified automatic search and status filter */}
      {SEARCHABLE.has(resource) && (
        <ManagementToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={`Search ${title.toLowerCase()}...`}
          filters={[
            {
              key: "status",
              label: `${title} status`,
              value: selectedStatus,
              onChange: changeStatus,
              options: (STATUS_FILTER_OPTIONS[resource] ?? ["all"]).map(
                (value) => ({
                  value,
                  label: value === "all"
                    ? "All Status"
                    : value.charAt(0).toUpperCase() + value.slice(1),
                }),
              ),
            },
          ]}
        />
      )}

      {/* RECORD TABLE */}

      <Box
        borderWidth="1px"
        borderRadius="xl"
        overflowX="auto"
      >
        <Table.Root
          size="sm"
        >
          <Table.Header>
            <Table.Row>
              {(TABLE_COLUMNS[resource] ?? []).map((column) => (
                <Table.ColumnHeader key={column.label} whiteSpace="nowrap">
                  {column.label}
                </Table.ColumnHeader>
              ))}
              <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {records.map(
              (record) => (
                <Table.Row
                  key={record._id}
                  bg={resource === "academic-years" && record.status === "active" ? "green.subtle" : undefined}
                >
                  {(TABLE_COLUMNS[resource] ?? []).map((column) => (
                    <Table.Cell key={column.label} whiteSpace="nowrap">
                      {column.status ? (
                        <Badge colorPalette={getStatusPalette(getStatus(record))} variant="subtle">
                          {getStatus(record)}
                        </Badge>
                      ) : (
                        <Text fontSize="sm" fontWeight={column.label === "Student ID" || column.label === "Program Name" ? "semibold" : "normal"}>
                          {column.value(record, references) ?? "—"}
                        </Text>
                      )}
                    </Table.Cell>
                  ))}

                  <Table.Cell>
                    <Flex
                      justify="flex-end"
                      gap={2}
                      wrap="wrap"
                    >
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          openDetails(
                            record,
                          )
                        }
                      >
                        Details
                      </Button>

                     {canEditRecord(resource, record) && (
  <Button
    size="xs"
    variant="outline"
    onClick={() => startEdit(record)}
  >
    Edit
  </Button>
)}

                     {/* ACADEMIC YEAR LIFECYCLE ACTIONS */}
                     {resource === "academic-years" &&
                       record.status === "planned" &&
                       record.isActive !== false && (
                         <Button
                           size="xs"
                           colorPalette="green"
                           variant="outline"
                           disabled={lifecycleSaving}
                           onClick={() => openLifecycleDialog(record, "activate")}
                         >
                           Activate
                         </Button>
                       )}

                     {resource === "academic-years" &&
                       record.status === "active" &&
                       record.isActive !== false && (
                         <Button
                           size="xs"
                           colorPalette="orange"
                           variant="outline"
                           disabled={lifecycleSaving}
                           onClick={() => openLifecycleDialog(record, "complete")}
                         >
                           Complete
                         </Button>
                       )}

                     {canArchiveRecord(resource, record) && (
  <Button
    size="xs"
    variant="outline"
    onClick={() =>
      performAction(record, "archive")
    }
  >
    Archive
  </Button>
)}

                     {/* PROGRAM PUBLISH / UNPUBLISH */}

{resource === "programs" &&
  record.isActive !== false && (
    <>
      {!record.isPublished ? (
        <Button
          size="xs"
          colorPalette="green"
          variant="outline"
          onClick={() =>
            performAction(record, "publish")
          }
        >
          Publish
        </Button>
      ) : (
        <Button
          size="xs"
          colorPalette="orange"
          variant="outline"
          onClick={() =>
            performAction(record, "unpublish")
          }
        >
          Unpublish
        </Button>
      )}
    </>
  )}

{/* EXISTING CURRICULUM PUBLISH */}

{resource === "curricula" &&
  record.status === "draft" && (
    <Button
      size="xs"
      variant="outline"
      onClick={() =>
        performAction(record, "publish")
      }
    >
      Publish
    </Button>
  )}
{resource === "curricula" &&
  record.status === "published" && (
    <Button
      size="xs"
      colorPalette="blue"
      variant="outline"
      onClick={() => openCloneDialog(record)}
    >
      Clone as Draft
    </Button>
  )}
                      {resource !== "program-enrollments" && resource !== "academic-years" && (
                        <Button
                          size="xs"
                          colorPalette="red"
                          variant="outline"
                          onClick={() => openDelete(record)}
                        >
                          Delete
                        </Button>
                      )}
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ),
            )}
          </Table.Body>
        </Table.Root>

        {loading && (
          <Flex
            justify="center"
            p={8}
          >
            <Spinner />
          </Flex>
        )}

        {!loading &&
          records.length ===
            0 && (
            <Text
              textAlign="center"
              color="fg.muted"
              p={8}
            >
              No records found.
            </Text>
          )}
      </Box>

      {/* PAGINATION */}

      <Flex
        justify="space-between"
        align="center"
      >
        <Text
          fontSize="sm"
          color="fg.muted"
        >
          Page {pagination.page ?? page} ·
          Total{" "}
          {pagination.total ??
            records.length}
        </Text>

        <Flex gap={2}>
          <Button
            size="sm"
            variant="outline"
            disabled={
              page <= 1 ||
              loading
            }
            onClick={() =>
              setPage(
                (value) =>
                  value - 1,
              )
            }
          >
            Previous
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={
              loading ||
              page >=
                (pagination.totalPages ??
                  1)
            }
            onClick={() =>
              setPage(
                (value) =>
                  value + 1,
              )
            }
          >
            Next
          </Button>
        </Flex>
      </Flex>

      {/* CREATE / EDIT DRAWER */}

      <Drawer.Root
        open={formOpen}
        onOpenChange={(
          details,
        ) => {
          if (!saving) {
            setFormOpen(
              details.open,
            );
          }
        }}
        placement="end"
        size="lg"
      >
        <Drawer.Backdrop />

        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>
                {editingId
                  ? "Edit"
                  : "Create"}{" "}
                {title}
              </Drawer.Title>
            </Drawer.Header>

            <Drawer.Body>
              <VStack
                align="stretch"
                gap={4}
              >
                {fields.map(
                  renderField,
                )}

                {error && (
                  <Text
                    color="red.500"
                    whiteSpace="pre-line"
                  >
                    {error}
                  </Text>
                )}
              </VStack>
            </Drawer.Body>

            <Drawer.Footer>
              <Button
                variant="outline"
                disabled={
                  saving
                }
                onClick={() =>
                  setFormOpen(
                    false,
                  )
                }
              >
                Cancel
              </Button>

              <Button
                loading={
                  saving
                }
                onClick={
                  saveRecord
                }
              >
                Save Changes
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>

      {/* DETAILS DRAWER */}

      <Drawer.Root
        open={
          detailsOpen
        }
        onOpenChange={(
          details,
        ) =>
          setDetailsOpen(
            details.open,
          )
        }
        placement="end"
        size="lg"
      >
        <Drawer.Backdrop />

        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>
                {title} Details
              </Drawer.Title>
            </Drawer.Header>

            <Drawer.Body>
              {detailsLoading ? (
                <Flex
                  justify="center"
                  py={10}
                >
                  <Spinner
                    size="lg"
                  />
                </Flex>
              ) : detailsError ? (
                <Text
                  color="red.500"
                >
                  {detailsError}
                </Text>
              ) : (
                <VStack
                  align="stretch"
                  gap={1}
                >
                  <Heading
                    size="md"
                    mb={3}
                  >
                    {getRecordTitle(
                      detailsRecord,
                    )}
                  </Heading>

                  {renderDetails()}
                </VStack>
              )}
            </Drawer.Body>

            <Drawer.Footer>
              <Button
                variant="outline"
                onClick={() =>
                  setDetailsOpen(
                    false,
                  )
                }
              >
                Close
              </Button>

            {detailsRecord &&
  canEditRecord(resource, detailsRecord) && (
    <Button
      onClick={() => {
        const record = detailsRecord;

        setDetailsOpen(false);
        startEdit(record);
      }}
    >
      Edit Record
    </Button>
  )}
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
{/* ==================================================
    CLONE CURRICULUM AS DRAFT DIALOG
================================================== */}

<Dialog.Root
  open={cloneOpen}
  onOpenChange={(details) => {
    if (!cloneSaving) {
      setCloneOpen(details.open);
    }
  }}
  placement="center"
  size="md"
>
  <Dialog.Backdrop />

  <Dialog.Positioner>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>
          Clone Curriculum as Draft
        </Dialog.Title>
      </Dialog.Header>

      <Dialog.Body>
        <VStack align="stretch" gap={4}>
          <Box
            p={3}
            borderWidth="1px"
            borderRadius="md"
          >
            <Text fontWeight="semibold">
              Source Curriculum
            </Text>

            <Text color="fg.muted" fontSize="sm">
              Version: {cloneSource?.version || "—"}
            </Text>

            <Text color="fg.muted" fontSize="sm">
              Status: {cloneSource?.status || "—"}
            </Text>
          </Box>

          <Field.Root required>
            <Field.Label>
              New Curriculum Version
            </Field.Label>

            <Input
              placeholder="e.g. v2.0"
              value={cloneVersion}
              disabled={cloneSaving}
              maxLength={40}
              onChange={(event) =>
                setCloneVersion(event.target.value)
              }
            />

            <Field.HelperText>
              Enter a unique version for this program.
            </Field.HelperText>
          </Field.Root>

          <Field.Root required>
            <Field.Label>
              Effective From
            </Field.Label>

            <Input
              type="date"
              value={cloneEffectiveFrom}
              disabled={cloneSaving}
              onChange={(event) =>
                setCloneEffectiveFrom(event.target.value)
              }
            />
          </Field.Root>

          <Text fontSize="sm" color="fg.muted">
            The original published curriculum will remain
            unchanged. A new draft will be created with
            the same semesters and courses.
          </Text>

          {cloneError && (
            <Box
              role="alert"
              borderWidth="1px"
              borderColor="red.400"
              borderRadius="md"
              p={3}
            >
              <Text color="red.500" whiteSpace="pre-line">
                {cloneError}
              </Text>
            </Box>
          )}
        </VStack>
      </Dialog.Body>

      <Dialog.Footer>
        <Button
          variant="outline"
          disabled={cloneSaving}
          onClick={() => setCloneOpen(false)}
        >
          Cancel
        </Button>

        <Button
          colorPalette="blue"
          loading={cloneSaving}
          disabled={
            !cloneVersion.trim() ||
            !cloneEffectiveFrom ||
            cloneSaving
          }
          onClick={submitClone}
        >
          Create Draft
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Positioner>
</Dialog.Root>
      {/* ACADEMIC YEAR LIFECYCLE DIALOG */}
      <Dialog.Root
        open={Boolean(lifecycleDialog)}
        onOpenChange={(details) => {
          if (!details.open) closeLifecycleDialog();
        }}
        placement="center"
        size="md"
        closeOnInteractOutside={!lifecycleSaving}
        closeOnEscape={!lifecycleSaving}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {lifecycleDialog?.action === "activate"
                  ? "Activate Academic Year"
                  : "Complete Academic Year"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={4}>
                <Text>
                  Academic Year: <strong>{lifecycleDialog ? getRecordTitle(lifecycleDialog.record) : ""}</strong>
                </Text>
                {lifecycleDialog?.action === "activate" ? (
                  <Text fontSize="sm" color="fg.muted">
                    This academic year will become active. The currently active
                    academic year, if any, will be marked as completed.
                    This action cannot be undone through the normal edit form.
                  </Text>
                ) : (
                  <Text fontSize="sm" color="fg.muted">
                    This academic year will be marked as completed. There may be
                    no active academic year until another planned year is activated.
                  </Text>
                )}
                {lifecycleError && (
                  <Box role="alert" borderWidth="1px" borderColor="red.400" borderRadius="md" p={3}>
                    <Text color="red.500" fontSize="sm" whiteSpace="pre-line">
                      {lifecycleError}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" disabled={lifecycleSaving} onClick={closeLifecycleDialog}>
                Cancel
              </Button>
              <Button
                colorPalette={lifecycleDialog?.action === "activate" ? "green" : "orange"}
                loading={lifecycleSaving}
                disabled={lifecycleSaving}
                onClick={confirmLifecycleAction}
              >
                {lifecycleDialog?.action === "activate"
                  ? "Confirm Activation"
                  : "Confirm Completion"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* SAFE DELETE DIALOG */}

      <Dialog.Root
        open={
          deleteOpen
        }
        onOpenChange={(
          details,
        ) => {
          if (!deleting) {
            setDeleteOpen(
              details.open,
            );
          }
        }}
        placement="center"
        size="md"
      >
        <Dialog.Backdrop />

        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                Delete Academic Record
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <VStack
                align="stretch"
                gap={4}
              >
                <Text>
                  Record:{" "}
                  <strong>
                    {getRecordTitle(
                      deleteRecord,
                    )}
                  </strong>
                </Text>

                {eligibilityLoading && (
                  <Flex
                    align="center"
                    gap={2}
                  >
                    <Spinner
                      size="sm"
                    />

                    <Text
                      fontSize="sm"
                    >
                      Checking related
                      academic records...
                    </Text>
                  </Flex>
                )}

                {eligibility && (
                  <>
                    <Badge
                      alignSelf="flex-start"
                      colorPalette={
                        eligibility.canDelete
                          ? "green"
                          : "red"
                      }
                    >
                      {eligibility.canDelete
                        ? "Eligible for deletion"
                        : "Deletion blocked"}
                    </Badge>

                    {eligibility.reason && (
                      <Text
                        color="red.500"
                        fontSize="sm"
                      >
                        {eligibility.reason}
                      </Text>
                    )}

                    {eligibility.dependencies
                      ?.length > 0 && (
                      <Box
                        borderWidth="1px"
                        borderRadius="md"
                        p={3}
                      >
                        <Text
                          fontWeight="semibold"
                          mb={2}
                        >
                          Related Records
                        </Text>

                        {eligibility.dependencies.map(
                          (
                            item,
                            index,
                          ) => (
                            <Flex
                              key={
                                item.name ??
                                index
                              }
                              justify="space-between"
                              py={1}
                            >
                              <Text
                                fontSize="sm"
                              >
                                {item.name}
                              </Text>

                              <Badge
                                colorPalette={
                                  item.count >
                                  0
                                    ? "red"
                                    : "gray"
                                }
                              >
                                {item.count}
                              </Badge>
                            </Flex>
                          ),
                        )}
                      </Box>
                    )}

                    {!eligibility.canDelete &&
                      eligibility.recommendedAction ===
                        "archive" && (
                        <Text
                          fontSize="sm"
                          color="fg.muted"
                        >
                          This record
                          may be archived
                          instead.
                        </Text>
                      )}

                    {eligibility.canDelete && (
                      <Box>
                        <Text
                          fontSize="sm"
                          mb={2}
                        >
                          This action
                          permanently
                          deletes the
                          record. Type{" "}
                          <strong>
                            DELETE
                          </strong>{" "}
                          to confirm.
                        </Text>

                        <Input
                          value={
                            confirmation
                          }
                          onChange={(
                            event,
                          ) =>
                            setConfirmation(
                              event.target.value,
                            )
                          }
                          placeholder="Type DELETE"
                          autoComplete="off"
                        />
                      </Box>
                    )}
                  </>
                )}

                {deleteError && (
                  <Text
                    color="red.500"
                    role="alert"
                  >
                    {deleteError}
                  </Text>
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <Button
                variant="outline"
                disabled={
                  deleting
                }
                onClick={() =>
                  setDeleteOpen(
                    false,
                  )
                }
              >
                Cancel
              </Button>

              <Button
                colorPalette="red"
                loading={
                  deleting
                }
                disabled={
                  eligibilityLoading ||
                  !eligibility?.canDelete ||
                  confirmation !==
                    "DELETE"
                }
                onClick={
                  confirmDelete
                }
              >
                Permanently Delete
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  );
}
