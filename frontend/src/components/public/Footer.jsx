import { Box, Container, Grid, GridItem, Heading, Link, Text, VStack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { useThemeMode } from "../../context/ThemeContext.jsx";

export default function Footer() {
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  return (
    <Box bg={isDark ? "black" : "gray.950"} color="white" mt="20">
      <Container maxW="1280px" py="14">
        <Grid templateColumns={{ base: "1fr", md: "2fr 1fr 1fr 1fr" }} gap="10">
          <GridItem>
            <Heading size="md">ACC Computer College</Heading>
            <Text color="gray.400" mt="4" maxW="420px" lineHeight="1.8">
              A modern college information platform for academic programs,
              student information, announcements, news and collaboration.
            </Text>
          </GridItem>

          <GridItem>
            <Heading size="sm" mb="4">Academic</Heading>
            <VStack align="start" gap="3">
              <Link as={RouterLink} to="/academic/courses">Courses</Link>
              <Link as={RouterLink} to="/academic/students">Students</Link>
              <Link as={RouterLink} to="/academic/entrance-list">Entrance List</Link>
            </VStack>
          </GridItem>

          <GridItem>
            <Heading size="sm" mb="4">College</Heading>
            <VStack align="start" gap="3">
              <Link as={RouterLink} to="/about">About Us</Link>
              <Link as={RouterLink} to="/faculties-staff">Faculties & Staff</Link>
              <Link as={RouterLink} to="/collaboration">Collaboration</Link>
            </VStack>
          </GridItem>

          <GridItem>
            <Heading size="sm" mb="4">Contact</Heading>
            <VStack align="start" gap="2" color="gray.400">
              <Text>Acc College</Text>
              <Text>info@acc.com</Text>
              <Text>+95 9 000 000 000</Text>
              <Text>@acc2026.aa</Text>
            </VStack>
          </GridItem>
        </Grid>

        <Text mt="12" pt="6" borderTopWidth="1px" borderColor="gray.800" textAlign="center" color="gray.500" fontSize="sm">
          © 2026 ACC Computer College. All rights reserved.
        </Text>
      </Container>
    </Box>
  );
}
