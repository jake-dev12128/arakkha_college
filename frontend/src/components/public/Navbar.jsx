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

import { MdDarkMode, MdOutlineLightMode } from "react-icons/md";

import { useThemeMode } from "../../context/ThemeContext.jsx";

// ==================================================
// NAVIGATION LINKS
// ==================================================

const links = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Faculties & Staff", to: "/faculties-staff" },
  { label: "Collaboration", to: "/collaboration" },
  { label: "News", to: "/news" },
  { label: "Programs", to: "/programs" },
  { label: "Contact", to: "/contact" },
];

const academicLinks = [
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
// NAVIGATION ITEM
// ==================================================

function NavItem({ to, children, onClick, isDark = false }) {
 const activeColor = isDark ? "#79B9FF" : "#2563EB";
const activeBg = isDark ? "#344A63" : "#EFF6FF";
const normalColor = isDark ? "#F3F7FF" : "#374151";

  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      style={({ isActive }) => ({
        color: isActive ? activeColor : normalColor,
        backgroundColor: isActive ? activeBg : "transparent",
        fontWeight: 600,
        borderRadius: "8px",
        padding: "8px 12px",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        transition: "all 0.2s ease",
      })}
      onMouseEnter={(event) => {
        event.currentTarget.style.color = activeColor;
        event.currentTarget.style.backgroundColor = activeBg;
      }}
      onMouseLeave={(event) => {
        const isActive =
          event.currentTarget.getAttribute("aria-current") === "page";

        event.currentTarget.style.color = isActive
          ? activeColor
          : normalColor;

        event.currentTarget.style.backgroundColor = isActive
          ? activeBg
          : "transparent";
      }}
    >
      {children}
    </NavLink>
  );
}

// ==================================================
// ACADEMIC MENU
// ==================================================

function AcademicMenu({ isDark, isActive }) {
  const activeColor = isDark ? "#93c5fd" : "#2563eb";
  const activeBg = isDark ? "#1e3a5f" : "#eff6ff";

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
                ? "gray.100"
                : "gray.700"
          }
          bg={isActive ? activeBg : "transparent"}
          _hover={{
            bg: isDark ? "gray.800" : "gray.100",
            color: isDark ? "blue.200" : "blue.600",
            textDecoration: "none",
          }}
          _focusVisible={{
            outline: "2px solid",
            outlineColor: isDark ? "blue.300" : "blue.500",
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
          minW="220px"
          p="1"
          bg={isDark ? "#172C49" : "white"}
color={isDark ? "#F3F7FF" : "#172B45"}
borderColor={isDark ? "#405772" : "#DCE5EF"}
          borderRadius="xl"
          boxShadow="lg"
        >
          {academicLinks.map((link) => (
            <Menu.Item
              key={link.to}
              value={link.to}
              asChild
              p="0"
              borderRadius="md"
              _hover={{
                bg: isDark ? "gray.800" : "gray.100",
              }}
            >
              <NavLink
                to={link.to}
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
                      ? "#f3f4f6"
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

function ThemeToggle({ isDark, toggleTheme, mobile = false }) {
  return (
    <IconButton
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      variant="ghost"
      size="sm"
      color={isDark ? "gray.100" : "gray.700"}
      borderRadius="lg"
      _hover={{
        bg: isDark ? "gray.800" : "gray.100",
      }}
      onClick={toggleTheme}
      display={mobile ? { base: "inline-flex", lg: "none" } : undefined}
    >
      {isDark ? <MdOutlineLightMode /> : <MdDarkMode />}
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

  // Academic remains active for all academic child routes.
  const isAcademicActive = location.pathname.startsWith("/academic/");

  const closeMobileMenu = () => {
    setOpen(false);
  };

  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      zIndex="1000"
      bg={isDark ? "gray.950" : "white"}
      color={isDark ? "gray.100" : "gray.800"}
      borderBottomWidth="1px"
      borderColor={isDark ? "gray.700" : "gray.200"}
      boxShadow="sm"
      transition="background 0.2s ease, color 0.2s ease"
    >
      <Container maxW="1280px">
        <Flex minH="76px" align="center" justify="space-between" gap="4">
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
              outlineColor: isDark ? "blue.300" : "blue.500",
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
                  color={isDark ? "white" : "gray.900"}
                  textDecoration="none"
                >
                  ARAKKHA
                </Text>

                <Text
                  fontSize="xs"
                  fontWeight="600"
                  color={isDark ? "gray.400" : "gray.500"}
                  mt="1"
                  letterSpacing="0.3px"
                  textDecoration="none"
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
            <NavItem to="/" isDark={isDark}>
              Home
            </NavItem>

            <NavItem to="/about" isDark={isDark}>
              About Us
            </NavItem>

            <AcademicMenu
              isDark={isDark}
              isActive={isAcademicActive}
            />

            {links
              .filter(
                (link) =>
                  link.to !== "/" && link.to !== "/about",
              )
              .map((link) => (
                <NavItem
                  key={link.to}
                  to={link.to}
                  isDark={isDark}
                >
                  {link.label}
                </NavItem>
              ))}

            <ThemeToggle
              isDark={isDark}
              toggleTheme={toggleTheme}
            />
          </HStack>

          {/* MOBILE CONTROLS */}

          <HStack gap="2" display={{ base: "flex", lg: "none" }}>
            <ThemeToggle
              isDark={isDark}
              toggleTheme={toggleTheme}
              mobile
            />

            <IconButton
              aria-label={open ? "Close navigation" : "Open navigation"}
              title={open ? "Close navigation" : "Open navigation"}
              variant="outline"
              color={isDark ? "gray.100" : "gray.700"}
              borderColor={isDark ? "gray.600" : "gray.300"}
              onClick={() => setOpen((value) => !value)}
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
            borderColor={isDark ? "gray.700" : "gray.200"}
          >
            {links.map((link) => (
              <NavItem
                key={link.to}
                to={link.to}
                onClick={closeMobileMenu}
                isDark={isDark}
              >
                {link.label}
              </NavItem>
            ))}

            {/* MOBILE ACADEMIC LINKS */}

            <Box>
              <Text
                fontSize="sm"
                fontWeight="700"
                color={
                  isAcademicActive
                    ? isDark
                      ? "#93c5fd"
                      : "#2563eb"
                    : isDark
                      ? "gray.400"
                      : "gray.500"
                }
                bg={
                  isAcademicActive
                    ? isDark
                      ? "#1e3a5f"
                      : "#eff6ff"
                    : "transparent"
                }
                borderRadius="md"
                px="3"
                py="2"
                mb="2"
              >
                Academic
              </Text>

              <VStack align="stretch" gap="2" pl="4">
                {academicLinks.map((link) => (
                  <NavItem
                    key={link.to}
                    to={link.to}
                    onClick={closeMobileMenu}
                    isDark={isDark}
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

