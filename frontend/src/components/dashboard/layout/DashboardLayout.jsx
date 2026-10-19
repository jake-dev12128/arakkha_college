
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";

import { useAuth } from "@clerk/react";

import {
  Box,
  Center,
  Drawer,
  Flex,
  Spinner,
  Text,
} from "@chakra-ui/react";

import api from "../../../api/api.js";

import useAuthStore from "../../../store/authStore.js";

import {
  getDashboardConfig,
} from "../../../config/dashboardMenus.js";

import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";

// ==================================================
// CONSTANTS
// ==================================================

const SIDEBAR_WIDTH = "260px";

const LOGIN_PATH = "/acc/auth/login";

const DASHBOARD_PATH = "/acc/auth/dashboard";

// ==================================================
// DASHBOARD LAYOUT
// ==================================================

export default function DashboardLayout() {
  // ==================================================
  // AUTHENTICATED USER FROM PROTECTED ROUTE
  // ==================================================

  const parentContext = useOutletContext();

  const user = parentContext?.user;

  // ==================================================
  // ROUTER
  // ==================================================

  const location = useLocation();

  const navigate = useNavigate();

  // ==================================================
  // CLERK AUTHENTICATION
  // ==================================================

  const {
    isLoaded,
    isSignedIn,
    signOut,
  } = useAuth();

  // ==================================================
  // ZUSTAND AUTH STORE
  // ==================================================

  const clearLoginAttempt = useAuthStore(
    (state) => state.clearLoginAttempt,
  );

  // ==================================================
  // LOCAL STATE
  // ==================================================

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [logoutError, setLogoutError] =
    useState("");

  // ==================================================
  // ROLE-BASED DASHBOARD CONFIG
  // ==================================================

  const config = useMemo(() => {
    if (!user?.role) return null;

    return getDashboardConfig(user.role);
  }, [user?.role]);

  // ==================================================
  // CURRENT PAGE TITLE
  // ==================================================

  const currentPageTitle = useMemo(() => {
    const sections = config?.sections ?? [];

    const items = sections.flatMap(
      (section) => section.items ?? [],
    );

    const currentItem = items.find(
      (item) => item.path === location.pathname,
    );

    if (currentItem) {
      return currentItem.label;
    }

    // Handle nested routes such as:
    // /students/create
    // /students/:id
    // /students/:id/edit

    const parentItem = items
      .filter(
        (item) =>
          location.pathname.startsWith(
            `${item.path}/`,
          ),
      )
      .sort(
        (a, b) =>
          b.path.length - a.path.length,
      )[0];

    return parentItem?.label ?? "Dashboard";
  }, [config, location.pathname]);

  // ==================================================
  // CLOSE MOBILE SIDEBAR ON NAVIGATION
  // ==================================================

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ==================================================
  // OPEN MOBILE SIDEBAR
  // ==================================================

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  // ==================================================
  // CLOSE MOBILE SIDEBAR
  // ==================================================

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    let backendLogoutSucceeded = false;

    try {
      // --------------------------------------------
      // STEP 1: BACKEND LOGOUT
      // --------------------------------------------
      //
      // The backend should revoke the current
      // application session and record the event.
      //
      // The Axios instance should attach the
      // current Clerk session token.
      // --------------------------------------------

      await api.post("/auth/logout");

      backendLogoutSucceeded = true;
    } catch (error) {
      console.error(
        "Backend logout failed:",
        error?.response?.data?.message ||
          error.message,
      );

      // Continue with Clerk sign-out.
      // Do not leave the browser authenticated
      // solely because the backend request failed.
    }

    try {
      // --------------------------------------------
      // STEP 2: CLERK SIGN OUT
      // --------------------------------------------

      await signOut();

      // --------------------------------------------
      // STEP 3: CLEAR LOCAL LOGIN ATTEMPT
      // --------------------------------------------

      clearLoginAttempt();

      // --------------------------------------------
      // STEP 4: REDIRECT TO LOGIN
      // --------------------------------------------

      navigate(LOGIN_PATH, {
        replace: true,
      });

      if (!backendLogoutSucceeded) {
        console.warn(
          "Clerk sign-out completed, but backend " +
            "session revocation was not confirmed.",
        );
      }
    } catch (error) {
      console.error(
        "Clerk logout failed:",
        error,
      );

      setLogoutError(
        "Sign out could not be completed. " +
          "Please try again.",
      );
    } finally {
      setLoggingOut(false);
    }
  }, [
    loggingOut,
    signOut,
    clearLoginAttempt,
    navigate,
  ]);

  // ==================================================
  // AUTH LOADING
  // ==================================================

  if (!isLoaded) {
    return (
      <Center minH="100vh">
        <Flex
          direction="column"
          align="center"
          gap={3}
        >
          <Spinner size="xl" />

          <Text color="fg.muted">
            Loading your account...
          </Text>
        </Flex>
      </Center>
    );
  }

  // ==================================================
  // PROTECTED ROUTE CONTEXT
  // ==================================================

  if (!isSignedIn || !user || !config) {
    return (
      <Center minH="100vh">
        <Flex
          direction="column"
          align="center"
          gap={3}
        >
          <Spinner size="lg" />

          <Text color="fg.muted">
            Verifying dashboard access...
          </Text>
        </Flex>
      </Center>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <Flex
      minH="100vh"
      bg="bg.subtle"
    >
      {/* ========================================== */}
      {/* DESKTOP SIDEBAR */}
      {/* ========================================== */}

      <Box
        display={{
          base: "none",
          lg: "block",
        }}
        position="fixed"
        top={0}
        left={0}
        bottom={0}
        width={SIDEBAR_WIDTH}
        zIndex={20}
      >
        <Sidebar user={user} />
      </Box>

      {/* ========================================== */}
      {/* MOBILE SIDEBAR */}
      {/* ========================================== */}

      <Drawer.Root
        open={sidebarOpen}
        onOpenChange={(details) => {
          setSidebarOpen(details.open);
        }}
        placement="start"
        size="xs"
      >
        <Drawer.Backdrop />

        <Drawer.Positioner>
          <Drawer.Content p={0}>
            <Drawer.Body p={0}>
              <Sidebar
                user={user}
                onNavigate={closeSidebar}
              />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>

      {/* ========================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================== */}

      <Box
        marginLeft={{
          base: 0,
          lg: SIDEBAR_WIDTH,
        }}
        width={{
          base: "100%",
          lg: `calc(100% - ${SIDEBAR_WIDTH})`,
        }}
        minWidth={0}
        minH="100vh"
      >
        {/* ======================================== */}
        {/* HEADER */}
        {/* ======================================== */}

        <Header
          user={user}
          title={currentPageTitle}
          onOpenSidebar={openSidebar}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />

        {/* ======================================== */}
        {/* LOGOUT ERROR */}
        {/* ======================================== */}

        {logoutError && (
          <Box
            role="alert"
            mx={{
              base: 4,
              md: 6,
            }}
            mt={4}
            p={3}
            borderWidth="1px"
            borderColor="red.400"
            borderRadius="md"
          >
            <Text
              color="red.500"
              fontSize="sm"
            >
              {logoutError}
            </Text>
          </Box>
        )}

        {/* ======================================== */}
        {/* NESTED DASHBOARD PAGES */}
        {/* ======================================== */}

        <Box
          as="main"
          p={{
            base: 4,
            md: 6,
            xl: 8,
          }}
          maxWidth="1600px"
          marginX="auto"
        >
          <Outlet
            context={{
              ...(parentContext ?? {}),
              user,
            }}
          />
        </Box>
      </Box>
    </Flex>
  );
}
