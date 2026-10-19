// ==================================================
// ACC COLLEGE MANAGEMENT SYSTEM
// ROLE-BASED DASHBOARD MENU CONFIGURATION
// ==================================================

// ==================================================
// MENU ITEM FACTORY
// ==================================================

const item = (label, path, icon) => ({
  label,
  path,
  icon,
});

// ==================================================
// COMMON MENU ITEMS
// ==================================================

const overview = item("Dashboard", "/acc/auth/dashboard", "dashboard");

const accountItems = [
  item("Account Overview", "/acc/auth/account", "user"),
  item("My Sessions", "/acc/auth/sessions", "sessions"),
];

// ==================================================
// ADMIN - USER MANAGEMENT
// ==================================================

const userManagementItems = [
  item("User Management", "/acc/auth/users", "students"),
  item("Students", "/acc/auth/students", "students"),
  item("Teachers", "/acc/auth/teachers", "teachers"),
];

// ==================================================
// ADMIN - ACADEMIC MANAGEMENT
// ==================================================

const academicManagementItems = [
  item("Programs", "/acc/auth/programs", "courses"),
  item("Courses", "/acc/auth/courses", "courses"),
  item("Curricula", "/acc/auth/curricula", "courses"),
  item("Academic Years", "/acc/auth/academic-years", "courses"),
  item("Cohorts", "/acc/auth/cohorts", "courses"),
  item("Enrollments", "/acc/auth/enrollments", "students"),
  item("Course Assignments", "/acc/auth/course-assignments", "courses"),
];
// ==================================================
// ENTRANCE MANAGEMENT
// ADMIN / SUPER ADMIN ONLY
// ==================================================

const entranceManagementItems = [
  item("Entrance Information", "/acc/auth/entrance-information", "courses"),
  item("Entrance Student Lists", "/acc/auth/entrance-lists", "students"),
];
// ==================================================
// SUPER ADMIN - ADMINISTRATION
// ==================================================
//
// Add Security Logs and Permission Management
// only after their actual frontend pages and
// protected backend endpoints are integrated.
//
// ==================================================

const superAdminItems = [
  item("Create Account", "/acc/auth/users/create", "students"),
];

// ==================================================
// TEACHER - ACADEMIC
// ==================================================

const teacherAcademicItems = [
  item("My Courses", "/acc/auth/my-courses", "courses"),
  item("My Students", "/acc/auth/my-students", "students"),
  item("Register Student", "/acc/auth/register-student", "students"),
];
const websiteManagementItems = [
  item("About Us", "/acc/auth/about-management", "courses"),

  item("Faculties & Staff", "/acc/auth/faculty-management", "teachers"),

  item("Collaboration", "/acc/auth/collaboration-management", "courses"),

  item("News Management", "/acc/auth/news-management", "news"),
];

// ==================================================
// STUDENT - MY LEARNING
// ==================================================

const studentLearningItems = [
  item("My Courses", "/acc/auth/my-courses", "courses"),
];

// ==================================================
// DASHBOARD MENUS
// ==================================================

export const dashboardMenus = {
  // ================================================
  // SUPER ADMIN
  // ================================================

  super_admin: {
    label: "Super Admin",

    sections: [
      {
        title: "Overview",
        items: [overview],
      },
      {
  title: "Website Management",
  items: websiteManagementItems,
},
      {
        title: "User Management",
        items: userManagementItems,
      },

      {
        title: "Academic Management",
        items: academicManagementItems,
      },
      {
        title: "Entrance Management",
        items: entranceManagementItems,
      },
      {
        title: "Administration",
        items: superAdminItems,
      },

      {
        title: "Account & Security",
        items: accountItems,
      },
    ],
  },

  // ================================================
  // ADMIN
  // ================================================

  admin: {
    label: "Administrator",

    sections: [
      {
        title: "Overview",
        items: [overview],
      },
{
  title: "Website Management",
  items: websiteManagementItems,
},
      {
        title: "User Management",
        items: userManagementItems,
      },

      {
        title: "Academic Management",
        items: academicManagementItems,
      },
      {
        title: "Entrance Management",
        items: entranceManagementItems,
      },
      {
        title: "Account & Security",
        items: accountItems,
      },
    ],
  },

  // ================================================
  // TEACHER
  // ================================================

  teacher: {
    label: "Teacher",

    sections: [
      {
        title: "Overview",
        items: [overview],
      },

      {
        title: "Academic",
        items: teacherAcademicItems,
      },

      {
        title: "Account & Security",
        items: accountItems,
      },
    ],
  },

  // ================================================
  // STUDENT
  // ================================================

  student: {
    label: "Student",

    sections: [
      {
        title: "Overview",
        items: [overview],
      },

      {
        title: "My Learning",
        items: studentLearningItems,
      },

      {
        title: "Account & Security",
        items: accountItems,
      },
    ],
  },
};

// ==================================================
// GET DASHBOARD CONFIG BY ROLE
// ==================================================

export const getDashboardConfig = (role) => {
  if (!role || typeof role !== "string") {
    return null;
  }

  return dashboardMenus[role] ?? null;
};

// ==================================================
// GET ALLOWED ROLES FOR MENU PATH
// ==================================================
//
// Used for menu visibility and navigation helpers.
//
// IMPORTANT:
// This is not a security authorization boundary.
// Backend middleware must enforce permissions.
//
// ==================================================

export const getAllowedRolesForPath = (path) => {
  if (!path || typeof path !== "string") {
    return [];
  }

  return Object.entries(dashboardMenus)
    .filter(([, config]) =>
      config.sections.some((section) =>
        section.items.some((entry) => entry.path === path),
      ),
    )
    .map(([role]) => role);
};

// ==================================================
// CHECK WHETHER ROLE HAS MENU ACCESS
// ==================================================

export const canAccessMenuPath = (role, path) => {
  return getAllowedRolesForPath(path).includes(role);
};

export default dashboardMenus;
