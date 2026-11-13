
import { useState } from "react";

import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  IconButton,
  Link,
  Menu,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  Link as RouterLink,
  NavLink,
  useLocation,
} from "react-router-dom";

import {
  MdDarkMode,
  MdOutlineLightMode,
} from "react-icons/md";

import { useThemeMode } from "../../context/ThemeContext.jsx";

// ==================================================
// PUBLIC NAVIGATION
// ==================================================


const links = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },

  // NEW: Public Organization Chart
  {
    label: "Organization Chart",
    to: "/organization-chart",
  },

  { label: "Faculties & Staff", to: "/faculties-staff" },
  { label: "Collaboration", to: "/collaboration" },
  { label: "News", to: "/news" },
  { label: "Programs", to: "/programs" },
  { label: "Contact", to: "/contact" },
];


const admissionLinks = [
  {
    label: "2026 Academic Year Entrance Information",
    to: "/academic/entrance-information",
  },
  {
    label: "Entrance Student Lists",
    to: "/academic/entrance-students",
  },
];

// ==================================================
// ROUTE ACTIVE HELPERS
// ==================================================

const normalizePath = (path) => {
  if (!path || path === "/") return "/";

  return path.replace(/\/+$/, "");
};

const isProgramsRoute = (pathname) => {
  const path = normalizePath(pathname);

  return (
    path === "/programs" ||
    path === "/academic/courses" ||
    path.startsWith("/academic/courses/")
  );
};

const isAdmissionRoute = (pathname) => {
  const path = normalizePath(pathname);

  return (
    path === "/academic/entrance-information" ||
    path === "/academic/entrance-students" ||
    path === "/academic/entrance-list"
  );
};

// ==================================================
// NAVIGATION ITEM
// ==================================================

function NavItem({
  to,
  children,
  onClick,
  isDark = false,
  activeOverride,
}) {
  const activeColor = isDark ? "#79B9FF" : "#2563EB";
  const activeBg = isDark ? "#344A63" : "#EFF6FF";
  const normalColor = isDark ? "#F3F7FF" : "#374151";

  return (
    <NavLink
      to={to}
      end
      onClick={onClick}
      style={({ isActive }) => {
        const active =
          activeOverride !== undefined
            ? activeOverride
            : isActive;

        return {
          color: active ? activeColor : normalColor,
          backgroundColor: active
            ? activeBg
            : "transparent",
          fontWeight: 600,
          borderRadius: "8px",
          padding: "8px 12px",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          transition: "all 0.2s ease",
        };
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.color = activeColor;
        event.currentTarget.style.backgroundColor =
          activeBg;
      }}
      onMouseLeave={(event) => {
        const active =
          activeOverride !== undefined
            ? activeOverride
            : event.currentTarget.getAttribute(
                "aria-current"
              ) === "page";

        event.currentTarget.style.color = active
          ? activeColor
          : normalColor;

        event.currentTarget.style.backgroundColor =
          active ? activeBg : "transparent";
      }}
    >
      {children}
    </NavLink>
  );
}

// ==================================================
// ADMISSION DROPDOWN
// ==================================================

function AdmissionMenu({ isDark, isActive }) {
  const activeColor = isDark ? "#93C5FD" : "#2563EB";
  const activeBg = isDark ? "#1E3A5F" : "#EFF6FF";

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          fontWeight="600"
          borderRadius="8px"
          color={
            isActive
              ? activeColor
              : isDark
                ? "#F3F7FF"
                : "#374151"
          }
          bg={isActive ? activeBg : "transparent"}
          _hover={{
            bg: isDark ? "#344A63" : "#EFF6FF",
            color: activeColor,
            textDecoration: "none",
          }}
          _focusVisible={{
            outline: "2px solid",
            outlineColor: activeColor,
            outlineOffset: "2px",
          }}
        >
          Admission
          <Text as="span" ml="1" aria-hidden="true">
            ▾
          </Text>
        </Button>
      </Menu.Trigger>

      <Menu.Positioner>
        <Menu.Content
          minW="260px"
          p="1"
          bg={isDark ? "#172C49" : "#FFFFFF"}
          color={isDark ? "#F3F7FF" : "#172B45"}
          borderColor={
            isDark ? "#405772" : "#DCE5EF"
          }
          borderRadius="xl"
          boxShadow="lg"
        >
          {admissionLinks.map((link) => (
            <Menu.Item
              key={link.to}
              value={link.to}
              asChild
              p="0"
              borderRadius="md"
              _hover={{
                bg: isDark ? "#344A63" : "#EFF6FF",
              }}
            >
              <NavLink
                to={link.to}
                end
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  color: isActive
                    ? activeColor
                    : isDark
                      ? "#F3F7FF"
                      : "#374151",
                  backgroundColor: isActive
                    ? activeBg
                    : "transparent",
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                {link.label}
              </NavLink>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}

// ==================================================
// THEME TOGGLE
// ==================================================

function ThemeToggle({
  isDark,
  toggleTheme,
  mobile = false,
}) {
  return (
    <IconButton
      aria-label={
        isDark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      title={
        isDark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      variant="ghost"
      size="sm"
      color={isDark ? "#F3F7FF" : "#374151"}
      borderRadius="lg"
      _hover={{
        bg: isDark ? "#344A63" : "#EFF6FF",
      }}
      onClick={toggleTheme}
      display={
        mobile
          ? { base: "inline-flex", lg: "none" }
          : undefined
      }
    >
      {isDark ? (
        <MdOutlineLightMode />
      ) : (
        <MdDarkMode />
      )}
    </IconButton>
  );
}

// ==================================================
// MAIN NAVBAR
// ==================================================

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const { theme, toggleTheme } = useThemeMode();
  const isDark = theme === "dark";

  const location = useLocation();
  const pathname = location.pathname;

  const isProgramsActive =
    isProgramsRoute(pathname);

  const isAdmissionActive =
    isAdmissionRoute(pathname);

  const closeMobileMenu = () => {
    setOpen(false);
  };

  const renderNavItem = (link, mobile = false) => (
    <NavItem
      key={link.to}
      to={link.to}
      isDark={isDark}
      onClick={mobile ? closeMobileMenu : undefined}
      activeOverride={
        link.to === "/programs"
          ? isProgramsActive
          : undefined
      }
    >
      {link.label}
    </NavItem>
  );

  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      zIndex="1000"
      bg={isDark ? "#172C49" : "#FFFFFF"}
      color={isDark ? "#F3F7FF" : "#172B45"}
      borderBottomWidth="1px"
      borderColor={
        isDark ? "#405772" : "#DCE5EF"
      }
      boxShadow="sm"
      transition="background 0.2s ease, color 0.2s ease"
    >
      <Container maxW="1280px">
        <Flex
          minH="76px"
          align="center"
          justify="space-between"
          gap="4"
        >
          {/* LOGO AND COLLEGE NAME */}

          <Link
            as={RouterLink}
            to="/"
            onClick={closeMobileMenu}
            flexShrink={0}
            _hover={{
              textDecoration: "none",
            }}
            _focusVisible={{
              outline: "2px solid",
              outlineColor: isDark
                ? "#93C5FD"
                : "#2563EB",
              outlineOffset: "3px",
              borderRadius: "md",
            }}
          >
            <HStack gap="3">
              <Box
                w={{ base: "54px", md: "66px" }}
                h={{ base: "54px", md: "66px" }}
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
              >
                <Box
                  as="img"
                  src="/logo.png"
                  alt="Arakkha Computer College logo"
                  w="100%"
                  h="100%"
                  objectFit="contain"
                />
              </Box>

              <Box>
                <Text
                  fontWeight="900"
                  lineHeight="1.2"
                  color={
                    isDark ? "#FFFFFF" : "#172B45"
                  }
                >
                  ARAKKHA
                </Text>

                <Text
                  fontSize="xs"
                  fontWeight="600"
                  color={
                    isDark ? "#B9CBE0" : "#64748B"
                  }
                  mt="1"
                  letterSpacing="0.3px"
                >
                  COMPUTER COLLEGE
                </Text>
              </Box>
            </HStack>
          </Link>

          {/* DESKTOP NAVIGATION */}

          <HStack
            display={{ base: "none", lg: "flex" }}
            gap={{ lg: "2", xl: "3" }}
            align="center"
          >
            {renderNavItem(links[0])}
            {renderNavItem(links[1])}

            <AdmissionMenu
              isDark={isDark}
              isActive={isAdmissionActive}
            />

            {links
              .filter(
                (link) =>
                  link.to !== "/" &&
                  link.to !== "/about"
              )
              .map((link) => renderNavItem(link))}

            <ThemeToggle
              isDark={isDark}
              toggleTheme={toggleTheme}
            />
          </HStack>

          {/* MOBILE CONTROLS */}

          <HStack
            gap="2"
            display={{ base: "flex", lg: "none" }}
          >
            <ThemeToggle
              isDark={isDark}
              toggleTheme={toggleTheme}
              mobile
            />

            <IconButton
              aria-label={
                open
                  ? "Close navigation"
                  : "Open navigation"
              }
              title={
                open
                  ? "Close navigation"
                  : "Open navigation"
              }
              variant="outline"
              color={
                isDark ? "#F3F7FF" : "#374151"
              }
              borderColor={
                isDark ? "#526984" : "#DCE5EF"
              }
              onClick={() =>
                setOpen((value) => !value)
              }
            >
              {open ? "✕" : "☰"}
            </IconButton>
          </HStack>
        </Flex>

        {/* MOBILE NAVIGATION */}

        {open && (
          <VStack
            display={{ base: "flex", lg: "none" }}
            align="stretch"
            gap="3"
            py="5"
            borderTopWidth="1px"
            borderColor={
              isDark ? "#405772" : "#DCE5EF"
            }
          >
            {links.map((link) =>
              renderNavItem(link, true)
            )}

            {/* MOBILE ADMISSION LINKS */}

            <Box>
              <Text
                fontSize="sm"
                fontWeight="700"
                color={
                  isAdmissionActive
                    ? isDark
                      ? "#93C5FD"
                      : "#2563EB"
                    : isDark
                      ? "#B9CBE0"
                      : "#64748B"
                }
                bg={
                  isAdmissionActive
                    ? isDark
                      ? "#1E3A5F"
                      : "#EFF6FF"
                    : "transparent"
                }
                borderRadius="md"
                px="3"
                py="2"
                mb="2"
              >
                Admission
              </Text>

              <VStack
                align="stretch"
                gap="2"
                pl="4"
              >
                {admissionLinks.map((link) => (
                  <NavItem
                    key={link.to}
                    to={link.to}
                    onClick={closeMobileMenu}
                    isDark={isDark}
                    activeOverride={
                      normalizePath(pathname) ===
                      link.to
                    }
                  >
                    {link.label}
                  </NavItem>
                ))}
              </VStack>
            </Box>
          </VStack>
        )}
      </Container>
    </Box>
  );
}
