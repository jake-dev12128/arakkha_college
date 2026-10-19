
import {
  Box,
  Card,
  Grid,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  FaArrowRight,
  FaBook,
  FaCalendarCheck,
  FaChartPie,
  FaUserGraduate,
} from "react-icons/fa6";

import { Link as RouterLink, useOutletContext } from "react-router-dom";
import { getDashboardConfig } from "../../config/dashboardMenus.js";

const roleCards = {
  super_admin: [
    ["Students", "/acc/auth/students", FaUserGraduate],
    ["Teachers", "/acc/auth/teachers", FaUserGraduate],
    ["Courses", "/acc/auth/courses", FaBook],
    ["Attendance", "/acc/auth/attendance", FaCalendarCheck],
  ],
  admin: [
    ["Students", "/acc/auth/students", FaUserGraduate],
    ["Teachers", "/acc/auth/teachers", FaUserGraduate],
    ["Courses", "/acc/auth/courses", FaBook],
    ["Enrollments", "/acc/auth/enrollments", FaChartPie],
  ],
  teacher: [
    ["My Courses", "/acc/auth/my-courses", FaBook],
    ["My Students", "/acc/auth/my-students", FaUserGraduate],
    ["Attendance", "/acc/auth/attendance", FaCalendarCheck],
    ["Results", "/acc/auth/results", FaChartPie],
  ],
  student: [
    ["My Courses", "/acc/auth/my-courses", FaBook],
    ["My Schedule", "/acc/auth/schedule", FaCalendarCheck],
    ["My Attendance", "/acc/auth/attendance", FaCalendarCheck],
    ["My Results", "/acc/auth/results", FaChartPie],
  ],
};

export default function DashboardHome() {
  const { user } = useOutletContext();
  const config = getDashboardConfig(user.role);
  const cards = roleCards[user.role] ?? [];

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="2xl">
          Welcome, {user.firstName}
        </Heading>

        <Text color="fg.muted" mt={2}>
          {config?.label} Dashboard — ACC Computer College
        </Text>
      </Box>

      <Grid
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, 1fr)",
          xl: "repeat(4, 1fr)",
        }}
        gap={4}
      >
        {cards.map(([label, path, Icon]) => (
          <RouterLink
            key={path}
            to={path}
            style={{ textDecoration: "none" }}
          >
            <Card.Root
              h="full"
              borderRadius="xl"
              _hover={{
                borderColor: "blue.400",
                shadow: "md",
              }}
              transition="all 0.2s"
            >
              <Card.Body>
                <VStack align="start" gap={5}>
                  <Box
                    bg="blue.subtle"
                    color="blue.fg"
                    p={3}
                    borderRadius="lg"
                  >
                    <Icon size={23} />
                  </Box>

                  <HStack
                    w="full"
                    justify="space-between"
                  >
                    <Text fontWeight="700">
                      {label}
                    </Text>
                    <FaArrowRight />
                  </HStack>
                </VStack>
              </Card.Body>
            </Card.Root>
          </RouterLink>
        ))}
      </Grid>

      <Card.Root borderRadius="xl">
        <Card.Body gap={3}>
          <Heading size="md">
            Academic Management
          </Heading>

          <Text color="fg.muted">
            Course enrollment, attendance, examinations
            and academic reports will be connected to
            authorized backend APIs in the next phases.
          </Text>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}
