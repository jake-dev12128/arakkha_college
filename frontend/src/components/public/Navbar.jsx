
import { useEffect, useState } from "react";

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
  MdMenu,
  MdClose,
  MdKeyboardArrowDown,
} from "react-icons/md";

import { useThemeMode } from "../../context/ThemeContext.jsx";

// ==================================================
// NAVIGATION CONFIGURATION
// ==================================================

const mainLinks = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
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

const staffLinks = [
  {
    label: "Organization Chart",
    to: "/organization-chart",
  },
  {
    label: "Faculties & Staff",
    to: "/faculties-staff",
  },
];

// ==================================================
// RESPONSIVE BREAKPOINT
// ==================================================

// 900px and above: Two-row full navigation
// Below 900px: Compact header and hamburger

const desktopOnly = {
  display: "none",
  "@media (min-width: 900px)": {
    display: "block",
  },
};

const mobileOnly = {
  display: "flex",
  "@media (min-width: 900px)": {
    display: "none",
  },
};

// ==================================================
// RESPONSIVE NAVIGATION TYPOGRAPHY
// ==================================================

const compactNavigation = {
  "--acc-nav-font-size": "14px",
  "--acc-nav-padding": "5px",
  gap: "0px",

  "@media (min-width: 1000px)": {
    "--acc-nav-font-size": "15px",
    "--acc-nav-padding": "8px",
    gap: "2px",
  },

  "@media (min-width: 1200px)": {
    "--acc-nav-font-size": "16px",
    "--acc-nav-padding": "10px",
    gap: "4px",
  },

  "@media (min-width: 1440px)": {
    "--acc-nav-font-size": "17px",
    "--acc-nav-padding": "13px",
    gap: "6px",
  },
};

// ==================================================
// ROUTE HELPERS
// ==================================================

const normalizePath = (path = "/") => {
  if (!path || path === "/") {
    return "/";
  }

  return path.replace(/\/+$/, "") || "/";
};

const matchesRoute = (pathname, route) => {
  const current = normalizePath(pathname);
  const target = normalizePath(route);

  if (target === "/") {
    return current === "/";
  }

  return (
    current === target ||
    current.startsWith(`${target}/`)
  );
};

const isProgramsRoute = (pathname) =>
  matchesRoute(pathname, "/programs") ||
  matchesRoute(pathname, "/academic/courses");

const isAdmissionRoute = (pathname) =>
  [
    ...admissionLinks.map((link) => link.to),
    "/academic/entrance-list",
  ].some((route) => matchesRoute(pathname, route));

const isStaffRoute = (pathname) =>
  staffLinks.some((link) =>
    matchesRoute(pathname, link.to)
  );

// ==================================================
// THEME COLORS
// ==================================================

const getColors = (isDark) => ({
  navbar: isDark ? "#172C49" : "#FFFFFF",
  surface: isDark ? "#223954" : "#FFFFFF",

  text: isDark ? "#DCE8F7" : "#475569",
  heading: isDark ? "#FFFFFF" : "#172B45",
  muted: isDark ? "#B9CBE0" : "#64748B",

  accent: isDark ? "#93C5FD" : "#2563EB",

  activeBg: isDark ? "#294360" : "#EFF6FF",
  hoverBg: isDark ? "#294360" : "#F1F5F9",

  border: isDark ? "#405772" : "#E2E8F0",
});

// ==================================================
// NAVIGATION ITEM
// ==================================================

function NavItem({
  to,
  children,
  isDark,
  activeOverride,
  onClick,
  mobile = false,
}) {
  const colors = getColors(isDark);

  return (
    <NavLink
      className={
        mobile
          ? "acc-mobile-nav-link"
          : "acc-nav-link"
      }
      to={to}
      end={to === "/"}
      onClick={onClick}
      style={({ isActive }) => {
        const active =
          activeOverride !== undefined
            ? activeOverride
            : isActive;

        return {
          display: "flex",
          alignItems: "center",
          justifyContent: mobile
            ? "flex-start"
            : "center",

          width: mobile ? "100%" : "auto",
          minHeight: mobile ? "48px" : "52px",

          padding: mobile
            ? "12px 16px"
            : "12px var(--acc-nav-padding)",

          borderRadius: mobile ? "9px" : "0",

          fontSize: mobile
            ? "16px"
            : "var(--acc-nav-font-size)",

          fontWeight: active ? 600 : 500,
          lineHeight: "1.4",

          whiteSpace: mobile
            ? "normal"
            : "nowrap",

          textDecoration: "none",

          color: active
            ? colors.accent
            : colors.text,

          backgroundColor:
            mobile && active
              ? colors.activeBg
              : "transparent",

          transition:
            "color 0.2s ease, background-color 0.2s ease",
        };
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.color =
          colors.accent;
      }}
      onMouseLeave={(event) => {
        const active =
          activeOverride !== undefined
            ? activeOverride
            : event.currentTarget.getAttribute(
                "aria-current"
              ) === "page";

        event.currentTarget.style.color = active
          ? colors.accent
          : colors.text;
      }}
    >
      {children}
    </NavLink>
  );
}

// ==================================================
// DESKTOP / TABLET DROPDOWN
// ==================================================

function DesktopDropdown({
  label,
  links,
  isDark,
  isActive,
  pathname,
}) {
  const colors = getColors(isDark);

  return (
    <Menu.Root
      positioning={{
        placement: "bottom-start",
        gutter: 6,
      }}
    >
      <Menu.Trigger asChild>
        <Button
          className="acc-nav-dropdown"
          type="button"
          variant="ghost"
          size="sm"
          minH="52px"
          h="52px"
          px="var(--acc-nav-padding)"
          gap="5px"
          borderRadius="0"
          fontSize="var(--acc-nav-font-size)"
          fontWeight={isActive ? 600 : 500}
          whiteSpace="nowrap"
          color={
            isActive
              ? colors.accent
              : colors.text
          }
          bg="transparent"
          _hover={{
            bg: "transparent",
            color: colors.accent,
          }}
          _focusVisible={{
            outline: "2px solid",
            outlineColor: colors.accent,
            outlineOffset: "2px",
          }}
        >
          {label}

          <MdKeyboardArrowDown size={18} />
        </Button>
      </Menu.Trigger>

      <Menu.Positioner>
        <Menu.Content
          minW="280px"
          maxW="360px"
          p="2"
          bg={colors.surface}
          color={colors.text}
          borderWidth="1px"
          borderColor={colors.border}
          borderRadius="12px"
          boxShadow="0 14px 36px rgba(0,0,0,0.16)"
          zIndex={1100}
        >
          {links.map((link) => {
            const active = matchesRoute(
              pathname,
              link.to
            );

            return (
              <Menu.Item
                key={link.to}
                value={link.to}
                asChild
                p="0"
                borderRadius="8px"
                bg={
                  active
                    ? colors.activeBg
                    : "transparent"
                }
                _hover={{
                  bg: colors.hoverBg,
                }}
              >
                <NavLink
                  to={link.to}
                  style={{
                    display: "flex",
                    alignItems: "center",

                    width: "100%",
                    minHeight: "46px",

                    padding: "12px 14px",
                    borderRadius: "8px",

                    fontSize: "15px",
                    fontWeight: active ? 600 : 500,

                    lineHeight: "1.5",
                    whiteSpace: "normal",

                    textDecoration: "none",

                    color: active
                      ? colors.accent
                      : colors.text,
                  }}
                >
                  {link.label}
                </NavLink>
              </Menu.Item>
            );
          })}
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}

// ==================================================
// MOBILE DROPDOWN
// ==================================================

function MobileDropdown({
  label,
  links,
  isDark,
  isActive,
  pathname,
  onNavigate,
}) {
  const [expanded, setExpanded] = useState(isActive);
  const colors = getColors(isDark);

  useEffect(() => {
    if (isActive) {
      setExpanded(true);
    }
  }, [isActive]);

  return (
    <Box w="full">
      <Button
        type="button"
        variant="ghost"
        w="full"
        minH="48px"
        h="auto"
        px="16px"
        py="12px"
        justifyContent="space-between"
        borderRadius="9px"
        fontSize="16px"
        fontWeight={isActive ? 600 : 500}
        color={
          isActive
            ? colors.accent
            : colors.text
        }
        bg={
          isActive
            ? colors.activeBg
            : "transparent"
        }
        _hover={{
          bg: colors.hoverBg,
          color: colors.accent,
        }}
        aria-expanded={expanded}
        onClick={() => {
          setExpanded((value) => !value);
        }}
      >
        {label}

        <Box
          transition="transform 0.2s ease"
          transform={
            expanded
              ? "rotate(180deg)"
              : "rotate(0deg)"
          }
        >
          <MdKeyboardArrowDown size={20} />
        </Box>
      </Button>

      {expanded && (
        <VStack
          align="stretch"
          gap="1"
          pl="4"
          pt="1"
          pb="2"
        >
          {links.map((link) => (
            <NavItem
              key={link.to}
              to={link.to}
              isDark={isDark}
              mobile
              onClick={onNavigate}
              activeOverride={matchesRoute(
                pathname,
                link.to
              )}
            >
              {link.label}
            </NavItem>
          ))}
        </VStack>
      )}
    </Box>
  );
}

// ==================================================
// THEME TOGGLE
// ==================================================

function ThemeToggle({
  isDark,
  toggleTheme,
}) {
  const colors = getColors(isDark);

  return (
    <IconButton
      type="button"
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
      minW="44px"
      minH="44px"
      borderRadius="10px"
      color={colors.text}
      _hover={{
        bg: colors.hoverBg,
        color: colors.accent,
      }}
      onClick={toggleTheme}
    >
      {isDark ? (
        <MdOutlineLightMode size={23} />
      ) : (
        <MdDarkMode size={23} />
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
  const colors = getColors(isDark);

  const location = useLocation();
  const pathname = location.pathname;

  const programsActive = isProgramsRoute(pathname);
  const admissionActive = isAdmissionRoute(pathname);
  const staffActive = isStaffRoute(pathname);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  const closeMobileMenu = () => {
    setOpen(false);
  };

  const renderNavItem = (link, mobile = false) => (
    <NavItem
      key={link.to}
      to={link.to}
      isDark={isDark}
      mobile={mobile}
      onClick={
        mobile
          ? closeMobileMenu
          : undefined
      }
      activeOverride={
        link.to === "/programs"
          ? programsActive
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
      zIndex={1000}
      bg={colors.navbar}
      color={colors.heading}
      borderBottomWidth="1px"
      borderColor={colors.border}
      boxShadow={
        isDark
          ? "0 2px 12px rgba(0,0,0,0.10)"
          : "0 2px 12px rgba(15,23,42,0.05)"
      }
      transition="background-color 0.2s ease"
    >
      <Container
        maxW="1440px"
        px={{
          base: 4,
          md: 6,
          xl: 8,
        }}
      >
        {/* ======================================
            TOP ROW - BRAND + CONTROLS
        ====================================== */}

        <Flex
          minH={{
            base: "78px",
            md: "70px",
          }}
          align="center"
          justify="space-between"
          gap={4}
        >
          {/* BRAND */}

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
              outlineColor: colors.accent,
              outlineOffset: "3px",
              borderRadius: "md",
            }}
          >
            <HStack gap="3">
              {/* LOGO */}

              <Box
                w={{
                  base: "56px",
                  md: "72px",
                }}
                h={{
                  base: "56px",
                  md: "72px",
                }}
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

              {/* COLLEGE NAME */}

              <Box>
                <Text
                  fontSize={{
                    base: "18px",
                    md: "22px",
                  }}
                  fontWeight="800"
                  lineHeight="1.15"
                  letterSpacing="0.3px"
                  color={colors.heading}
                >
                  ARAKKHA
                </Text>

                <Text
                  mt="5px"
                  fontSize={{
                    base: "11px",
                    md: "13px",
                  }}
                  fontWeight="600"
                  letterSpacing="0.5px"
                  lineHeight="1.3"
                  color={colors.muted}
                  whiteSpace="nowrap"
                >
                  COMPUTER COLLEGE
                </Text>
              </Box>
            </HStack>
          </Link>

          {/* RIGHT CONTROLS */}

          <HStack gap="2">
            <ThemeToggle
              isDark={isDark}
              toggleTheme={toggleTheme}
            />

            {/* HAMBURGER: BELOW 900px */}

            <Box css={mobileOnly}>
              <IconButton
                type="button"
                aria-label={
                  open
                    ? "Close navigation"
                    : "Open navigation"
                }
                aria-expanded={open}
                aria-controls="acc-mobile-navigation"
                variant="ghost"
                minW="44px"
                minH="44px"
                borderRadius="10px"
                color={colors.text}
                _hover={{
                  bg: colors.hoverBg,
                  color: colors.accent,
                }}
                onClick={() => {
                  setOpen((value) => !value);
                }}
              >
                {open ? (
                  <MdClose size={25} />
                ) : (
                  <MdMenu size={25} />
                )}
              </IconButton>
            </Box>
          </HStack>
        </Flex>

        {/* ======================================
            DESKTOP + TABLET NAVIGATION
            VISIBLE FROM 900px
        ====================================== */}

        <Box
          css={desktopOnly}
          borderTopWidth="1px"
          borderColor={colors.border}
        >
          <Flex
            css={compactNavigation}
            minH="56px"
            align="center"
            justify="center"
            flexWrap="nowrap"
            whiteSpace="nowrap"
          >
            {renderNavItem(mainLinks[0])}
            {renderNavItem(mainLinks[1])}

            <DesktopDropdown
              label="Admission"
              links={admissionLinks}
              isDark={isDark}
              isActive={admissionActive}
              pathname={pathname}
            />

            <DesktopDropdown
              label="Staff & Organization"
              links={staffLinks}
              isDark={isDark}
              isActive={staffActive}
              pathname={pathname}
            />

            {mainLinks.slice(2).map((link) =>
              renderNavItem(link, false)
            )}
          </Flex>
        </Box>

        {/* ======================================
            MOBILE NAVIGATION
            VISIBLE BELOW 900px
        ====================================== */}

        <Box
          id="acc-mobile-navigation"
          css={mobileOnly}
          flexDirection="column"
        >
          {open && (
            <VStack
              w="full"
              align="stretch"
              gap="1"
              py="4"
              maxH="calc(100dvh - 78px)"
              overflowY="auto"
              borderTopWidth="1px"
              borderColor={colors.border}
            >
              {renderNavItem(mainLinks[0], true)}
              {renderNavItem(mainLinks[1], true)}

              <MobileDropdown
                label="Admission"
                links={admissionLinks}
                isDark={isDark}
                isActive={admissionActive}
                pathname={pathname}
                onNavigate={closeMobileMenu}
              />

              <MobileDropdown
                label="Staff & Organization"
                links={staffLinks}
                isDark={isDark}
                isActive={staffActive}
                pathname={pathname}
                onNavigate={closeMobileMenu}
              />

              {mainLinks.slice(2).map((link) =>
                renderNavItem(link, true)
              )}
            </VStack>
          )}
        </Box>
      </Container>
    </Box>
  );
}
