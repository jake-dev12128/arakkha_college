import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useOutletContext,
} from "react-router-dom";

// ==================================================
// PUBLIC LAYOUT
// ==================================================

import PublicLayout from "../layouts/PublicLayout.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import RequireCourseAccess from "../components/public/RequireCourseAccess.jsx";
// ==================================================
// PUBLIC PAGES
// ==================================================

import Home from "../pages/public/Home.jsx";
import About from "../pages/public/About.jsx";
import Organization from "../pages/public/Organization.jsx";
import Courses from "../pages/public/Courses.jsx";
import Students from "../pages/public/Students.jsx";
import EntranceInformation from "../pages/public/EntranceInformation.jsx";

import EntranceStudentLists from "../pages/public/EntranceStudentLists.jsx";
import FacultyStaff from "../pages/public/FacultyStaff.jsx";
import Collaboration from "../pages/public/Collaboration.jsx";
import CollaborationDetail from "../pages/public/CollaborationDetail.jsx";
import News from "../pages/public/News.jsx";import NewsDetail from "../pages/public/NewsDetail.jsx";
import Programs from "../pages/public/Programs.jsx";
import Contact from "../pages/public/Contact.jsx";
import NotFound from "../pages/public/NotFound.jsx";

// ==================================================
// AUTH PAGES
// ==================================================

import Welcome from "../pages/auth/Welcome.jsx";
import Login from "../pages/auth/Login.jsx";
import Verify2FA from "../pages/auth/Verify2FA.jsx";
import Dashboard from "../pages/auth/Dashboard.jsx";
import ForgotPassword from "../pages/auth/ForgotPassword.jsx";
import VerifyResetOtp from "../pages/auth/VerifyResetOtp.jsx";
import ResetPassword from "../pages/auth/ResetPassword.jsx";
import Sessions from "../pages/auth/Sessions.jsx";

// ==================================================
// AUTH GUARDS
// ==================================================

import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";
import GuestRoute from "../components/auth/GuestRoute.jsx";
import AuthSessionManager from "../components/auth/AuthSessionManager.jsx";

// ==================================================
// DASHBOARD LAYOUT AND COMMON COMPONENTS
// ==================================================

import DashboardLayout from "../components/dashboard/layout/DashboardLayout.jsx";
import FeaturePage from "../components/dashboard/FeaturePage.jsx";

// ==================================================
// DASHBOARD PAGES
// ==================================================

import RoleDashboard from "../pages/dashboard/RoleDashboard.jsx";
import AdminOverview from "../pages/dashboard/AdminOverview.jsx";

import UserManagement from "../pages/dashboard/UserManagement.jsx";
import CreateAccount from "../pages/dashboard/CreateAccount.jsx";

import RoleManagement from "../pages/dashboard/RoleManagement.jsx";
import ProfileForm from "../pages/dashboard/ProfileForm.jsx";
import ProfileDetails from "../pages/dashboard/ProfileDetails.jsx";
import AboutManagement from "../pages/dashboard/AboutManagement.jsx";
import FacultyManagement from "../pages/dashboard/FacultyManagement.jsx";
import FacultyStaffDetail from "../pages/public/FacultyStaffDetail.jsx";
import CollaborationManagement from "../pages/dashboard/CollaborationManagement.jsx";
import NewsManagement from "../pages/dashboard/NewsManagement.jsx";
// ==================================================
// ACADEMIC MANAGEMENT
// ==================================================

import AcademicManagement from "../pages/dashboard/AcademicManagement.jsx";
import EntranceManagement from "../pages/dashboard/EntranceManagement.jsx";
// ==================================================
// COURSE ACCESS MANAGEMENT
// ==================================================

import CourseAssignments from "../pages/dashboard/CourseAssignments.jsx";
import MyCourses from "../pages/dashboard/MyCourses.jsx";

// ==================================================
// ROLE GUARD
// ==================================================

function RequireRole({ allowedRoles, children }) {
  const context = useOutletContext();

  const user = context?.user;

  if (!user) {
    return <Navigate to="/acc/auth/dashboard" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/acc/auth/dashboard" replace />;
  }

  return children;
}

// ==================================================
// ROLE CONSTANTS
// ==================================================

const ADMIN_ROLES = ["super_admin", "admin"];

const TEACHER_ROLES = ["teacher"];

const STUDENT_ROLES = ["student"];

const COURSE_VIEW_ROLES = ["teacher", "student"];

// ==================================================
// MAIN ROUTES
// ==================================================

export default function AppRoutes() {
  return (
    <BrowserRouter>
      {/* ======================================== */}
      {/* AUTH SESSION MANAGER */}
      {/* ======================================== */}

      <AuthSessionManager />

      <Routes>
        {/* ====================================== */}
        {/* PUBLIC WEBSITE */}
        {/* ====================================== */}

        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />

          <Route path="/about" element={<About />} />

          <Route path="/organization" element={<Organization />} />

          <Route path="/academic/students" element={<Students />} />

          <Route
            path="/academic/courses"
            element={<Navigate to="/programs" replace />}
          />

          <Route element={<RequireCourseAccess />}>
            <Route path="/academic/courses/:programId" element={<Courses />} />
          </Route>
          <Route
            path="/academic/entrance-information"
            element={<EntranceInformation />}
          />

          <Route
            path="/academic/entrance-students"
            element={<EntranceStudentLists />}
          />

          <Route
            path="/academic/entrance-list"
            element={<Navigate to="/academic/entrance-students" replace />}
          />
          <Route path="/faculties-staff" element={<FacultyStaff />} />
          <Route path="/faculties-staff/:id" element={<FacultyStaffDetail />} />
          <Route path="/collaboration" element={<Collaboration />} />
          <Route path="/collaboration/:id" element={<CollaborationDetail />} />
          <Route path="/news" element={<News />} />
<Route
  path="/news/:id"
  element={<NewsDetail />}
/>
          <Route path="/programs" element={<Programs />} />

          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* ====================================== */}
        {/* AUTHENTICATION / ACC PORTAL */}
        {/* ====================================== */}

        <Route element={<AuthLayout />}>
          {/* ==================================== */}
          {/* GUEST ROUTES */}
          {/* ==================================== */}

          <Route element={<GuestRoute />}>
            <Route path="/acc/auth" element={<Welcome />} />

            <Route path="/acc/auth/login" element={<Login />} />

            <Route
              path="/acc/auth/forgot-password"
              element={<ForgotPassword />}
            />

            <Route
              path="/acc/auth/verify-reset-otp"
              element={<VerifyResetOtp />}
            />

            <Route
              path="/acc/auth/reset-password"
              element={<ResetPassword />}
            />
          </Route>

          {/* ==================================== */}
          {/* CLERK MFA VERIFICATION */}
          {/* ==================================== */}

          <Route path="/acc/auth/verify-2fa" element={<Verify2FA />} />

          {/* ==================================== */}
          {/* AUTHENTICATED ROUTES */}
          {/* ==================================== */}

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              {/* ================================ */}
              {/* ROLE DASHBOARD */}
              {/* ================================ */}

              <Route path="/acc/auth/dashboard" element={<RoleDashboard />} />
              {/* ABOUT US MANAGEMENT */}
              <Route
                path="/acc/auth/about-management"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <AboutManagement />
                  </RequireRole>
                }
              />

              {/* FACULTIES & STAFF MANAGEMENT */}
              <Route
                path="/acc/auth/faculty-management"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <FacultyManagement />
                  </RequireRole>
                }
              />
              {/** ====================================  */}
              {/** COLLABORATION & PARTANER MANAGEMENT  */}
              {/** ====================================== */}
              <Route
                path="/acc/auth/collaboration-management"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <CollaborationManagement />
                  </RequireRole>
                }
              />
              {/* NEWS MANAGEMENT */}
              <Route
                path="/acc/auth/news-management"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <NewsManagement />
                  </RequireRole>
                }
              />
              {/* ================================ */}
              {/* ADMIN OVERVIEW */}
              {/* ================================ */}

              <Route
                path="/acc/auth/admin-dashboard"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <AdminOverview />
                  </RequireRole>
                }
              />

              {/* ================================ */}
              {/* USER MANAGEMENT */}
              {/* ================================ */}

              <Route
                path="/acc/auth/users"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <UserManagement />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/users/create"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <CreateAccount />
                  </RequireRole>
                }
              />

              {/* ================================ */}
              {/* STUDENT MANAGEMENT */}
              {/* ================================ */}

              <Route
                path="/acc/auth/students"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <RoleManagement role="student" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/students/create"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <ProfileForm role="student" mode="create" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/students/:id/edit"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <ProfileForm role="student" mode="edit" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/students/:id"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <ProfileDetails role="student" />
                  </RequireRole>
                }
              />

              {/* ================================ */}
              {/* TEACHER MANAGEMENT */}
              {/* ================================ */}

              <Route
                path="/acc/auth/teachers"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <RoleManagement role="teacher" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/teachers/create"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <ProfileForm role="teacher" mode="create" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/teachers/:id/edit"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <ProfileForm role="teacher" mode="edit" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/teachers/:id"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <ProfileDetails role="teacher" />
                  </RequireRole>
                }
              />

              {/* ================================ */}
              {/* TEACHER CREATES STUDENT */}
              {/* ================================ */}

              <Route
                path="/acc/auth/register-student"
                element={
                  <RequireRole allowedRoles={TEACHER_ROLES}>
                    <CreateAccount />
                  </RequireRole>
                }
              />

              {/* ================================ */}
              {/* ACADEMIC MANAGEMENT */}
              {/* ADMIN / SUPER ADMIN */}
              {/* ================================ */}

              <Route
                path="/acc/auth/programs"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <AcademicManagement resource="programs" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/courses"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <AcademicManagement resource="courses" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/curricula"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <AcademicManagement resource="curricula" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/academic-years"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <AcademicManagement resource="academic-years" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/cohorts"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <AcademicManagement resource="cohorts" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/enrollments"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <AcademicManagement resource="program-enrollments" />
                  </RequireRole>
                }
              />
              {/* ====================================== */}
              {/* ENTRANCE MANAGEMENT */}
              {/* ADMIN / SUPER ADMIN ONLY */}
              {/* ====================================== */}

              <Route
                path="/acc/auth/entrance-information"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <EntranceManagement resource="information" />
                  </RequireRole>
                }
              />

              <Route
                path="/acc/auth/entrance-lists"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <EntranceManagement resource="lists" />
                  </RequireRole>
                }
              />
              {/* ================================ */}
              {/* COURSE ASSIGNMENT MANAGEMENT */}
              {/* ADMIN / SUPER ADMIN */}
              {/* ================================ */}

              <Route
                path="/acc/auth/course-assignments"
                element={
                  <RequireRole allowedRoles={ADMIN_ROLES}>
                    <CourseAssignments />
                  </RequireRole>
                }
              />

              {/* ================================ */}
              {/* TEACHER / STUDENT MY COURSES */}
              {/* ================================ */}

              <Route
                path="/acc/auth/my-courses"
                element={
                  <RequireRole allowedRoles={COURSE_VIEW_ROLES}>
                    <MyCourses />
                  </RequireRole>
                }
              />

              {/* ================================ */}
              {/* TEACHER MY STUDENTS */}
              {/* ================================ */}

              <Route
                path="/acc/auth/my-students"
                element={
                  <RequireRole allowedRoles={TEACHER_ROLES}>
                    <MyCourses rosterOnly />
                  </RequireRole>
                }
              />

              {/* ================================ */}
              {/* ACCOUNT OVERVIEW */}
              {/* ================================ */}

              <Route path="/acc/auth/account" element={<Dashboard />} />

              {/* ================================ */}
              {/* SESSION MANAGEMENT */}
              {/* ================================ */}

              <Route path="/acc/auth/sessions" element={<Sessions />} />

              {/* ================================ */}
              {/* EXISTING FEATURE FALLBACK */}
              {/* ================================ */}

              <Route path="/acc/auth/:feature" element={<FeaturePage />} />
            </Route>
          </Route>
        </Route>

        {/* ====================================== */}
        {/* LEGACY URL REDIRECTS */}
        {/* ====================================== */}

        <Route
          path="/login"
          element={<Navigate to="/acc/auth/login" replace />}
        />

        <Route
          path="/verify-2fa"
          element={<Navigate to="/acc/auth/verify-2fa" replace />}
        />

        <Route
          path="/forgot-password"
          element={<Navigate to="/acc/auth/forgot-password" replace />}
        />

        <Route
          path="/verify-reset-otp"
          element={<Navigate to="/acc/auth/verify-reset-otp" replace />}
        />

        <Route
          path="/reset-password"
          element={<Navigate to="/acc/auth/reset-password" replace />}
        />

        <Route
          path="/dashboard"
          element={<Navigate to="/acc/auth/dashboard" replace />}
        />

        <Route
          path="/sessions"
          element={<Navigate to="/acc/auth/sessions" replace />}
        />

        {/* ====================================== */}
        {/* NOT FOUND */}
        {/* ====================================== */}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
