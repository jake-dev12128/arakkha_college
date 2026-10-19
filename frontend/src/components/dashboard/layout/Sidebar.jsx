import {
  Box,
  Flex,
  HStack,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";

import { NavLink } from "react-router-dom";

import {
  FaBook,
  FaCalendarCheck,
  FaChartPie,
  FaClipboardCheck,
  FaGraduationCap,
  FaNewspaper,
  FaShieldHalved,
  FaUserGraduate,
  FaUser,
  FaDesktop,
} from "react-icons/fa6";

import { getDashboardConfig } from "../../../config/dashboardMenus.js";

// ACC Computer College Brand Colors
const colors = {
  sidebar: "#253783",
  sidebarHeader: "#192968",
  active: "#4359B5",
  activeHover: "#5067C7",
  hover: "#30458F",
  gold: "#F2A23A",
  white: "#FFFFFF",
  text: "#F0F3FF",
  muted: "#C5CFF0",
  border: "#3B4A8D",
};

const icons = {
  dashboard: FaChartPie,
  students: FaUserGraduate,
  teachers: FaGraduationCap,
  courses: FaBook,
  attendance: FaCalendarCheck,
  results: FaClipboardCheck,
  news: FaNewspaper,
  security: FaShieldHalved,
  user: FaUser,
  sessions: FaDesktop,
};

export default function Sidebar({ user, onNavigate }) {
  const config = getDashboardConfig(user.role);

  if (!config) return null;

  return (
    <Box
      as="aside"
      h="full"
      w="full"
      bg={colors.sidebar}
      color={colors.text}
      borderRight="1px solid"
      borderColor={colors.border}
      overflowY="auto"
      
    >
      {/* BRAND HEADER */}
      <Flex
        minH="88px"
        px={4}
        py={3}
        align="center"
        bg={colors.sidebarHeader}
        borderBottom="1px solid"
        borderColor={colors.border}
      >
        <HStack gap={3} minW={0}>
          {/* Original Logo - source unchanged */}
          <Flex
            boxSize="62px"
            minW="62px"
            align="center"
            justify="center"
            p={1}
            flexShrink={0}
          >
            <Image
              src="/logo.png"
              alt="ACC Computer College Logo"
              boxSize="100%"
              objectFit="contain"
            />
          </Flex>

          <Box minW={0}>
            <Text
              fontWeight="800"
              fontSize="sm"
              lineHeight="1.5"
              color={colors.white}
            >
              ACC Computer College
            </Text>

            <Text
              mt={1}
              fontSize="10px"
              fontWeight="700"
              letterSpacing="1px"
              color={colors.muted}
            >
              MANAGEMENT SYSTEM
            </Text>
          </Box>
        </HStack>
      </Flex>

      {/* NAVIGATION */}
      <Box px={3} py={5}>
        {config.sections.map((section) => (
          <Box key={section.title} mb={6}>
            {/* SECTION TITLE */}
            <Text
              px={3}
              mb={3}
              fontSize="xs"
              fontWeight="800"
              color={colors.muted}
              textTransform="uppercase"
              letterSpacing="1.2px"
            >
              {section.title}
            </Text>

            <VStack align="stretch" gap={1}>
              {section.items.map((entry) => {
                const Icon =
                  icons[entry.icon] ?? FaChartPie;

                return (
                  <NavLink
                    key={entry.path}
                    to={entry.path}
                    end
                    onClick={onNavigate}
                    style={{ textDecoration: "none" }}
                  >
                    {({ isActive }) => (
                      <HStack
                        gap={3}
                        px={3}
                        py={3}
                        minH="46px"
                        borderRadius="lg"
                        borderLeft="3px solid"
                        borderLeftColor={
                          isActive
                            ? colors.gold
                            : "transparent"
                        }
                        bg={
                          isActive
                            ? colors.active
                            : "transparent"
                        }
                        color={
                          isActive
                            ? colors.white
                            : colors.text
                        }
                        fontWeight={isActive ? "700" : "500"}
                        transition="all 0.2s ease"
                        cursor="pointer"
                        _hover={{
                          bg: isActive
                            ? colors.activeHover
                            : colors.hover,
                          color: colors.white,
                        }}
                      >
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          minW="20px"
                          color={
                            isActive
                              ? colors.gold
                              : colors.muted
                          }
                        >
                          <Icon size={17} />
                        </Box>

                        <Text fontSize="sm">
                          {entry.label}
                        </Text>
                      </HStack>
                    )}
                  </NavLink>
                );
              })}
            </VStack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
