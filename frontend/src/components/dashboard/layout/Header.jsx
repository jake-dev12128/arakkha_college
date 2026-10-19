import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Text,
} from "@chakra-ui/react";

import {
  FaBars,
  FaArrowRightFromBracket,
} from "react-icons/fa6";

import { getDashboardConfig } from "../../../config/dashboardMenus.js";

const colors = {
  header: "#192968",
  border: "#3B4A8D",
  white: "#FFFFFF",
  muted: "#C7D0F5",
  hover: "#2C3C80",
  gold: "#F2A23A",
};

export default function Header({
  user,
  title,
  onOpenSidebar,
  onLogout,
  loggingOut,
}) {
  const config = getDashboardConfig(user.role);

  return (
    <Flex
      as="header"
      h="88px"
      minH="88px"
      px={{ base: 4, md: 6 }}
      bg={colors.header}
      color={colors.white}
      borderBottom="1px solid"
      borderColor={colors.border}
      align="center"
      justify="space-between"
      gap={3}
      boxShadow="0 2px 8px rgba(0, 0, 0, 0.12)"
      position="relative"
      zIndex={1}
    >
      {/* LEFT: MOBILE MENU + PAGE TITLE */}
      <HStack gap={3} minW={0}>
        <IconButton
          aria-label="Open sidebar"
          variant="ghost"
          color={colors.white}
          display={{ base: "inline-flex", lg: "none" }}
          onClick={onOpenSidebar}
          _hover={{
            bg: colors.hover,
            color: colors.gold,
          }}
        >
          <FaBars />
        </IconButton>

        <Box minW={0}>
          <Text
            fontWeight="800"
            fontSize={{ base: "sm", md: "lg" }}
            color={colors.white}
            truncate
          >
            {title}
          </Text>

          <Text
            mt={1}
            fontSize="xs"
            color={colors.muted}
            truncate
          >
            {config?.label ?? "Account"}
          </Text>
        </Box>
      </HStack>

      {/* RIGHT: USER + LOGOUT */}
      <HStack gap={{ base: 2, md: 4 }} flexShrink={0}>
        <Box
          display={{ base: "none", md: "block" }}
          textAlign="right"
        >
          <Text
            fontSize="sm"
            fontWeight="600"
            color={colors.white}
          >
            {user.firstName} {user.lastName}
          </Text>

          <Text fontSize="xs" color={colors.muted}>
            {config?.label ?? "Account"}
          </Text>
        </Box>

        <Button
          size="sm"
          variant="outline"
          colorPalette="red"
          loading={loggingOut}
          onClick={onLogout}
          borderColor="#F87171"
          color="#FCA5A5"
          bg="transparent"
          _hover={{
            bg: "#7F1D1D",
            color: colors.white,
            borderColor: "#FCA5A5",
          }}
        >
          <FaArrowRightFromBracket />

          <Text display={{ base: "none", sm: "inline" }}>
            Logout
          </Text>
        </Button>
      </HStack>
    </Flex>
  );
}
