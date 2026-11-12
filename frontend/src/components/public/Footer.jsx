
import {
  Box,
  Container,
  Grid,
  GridItem,
  Heading,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react";

import { Link as RouterLink } from "react-router-dom";

import { useThemeMode } from "../../context/ThemeContext.jsx";

// ==================================================
// FOOTER NAVIGATION
// ==================================================

const collegeLinks = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  {
    label: "Faculties & Staff",
    to: "/faculties-staff",
  },
  {
    label: "Collaboration",
    to: "/collaboration",
  },
];

const informationLinks = [
  {
    label: "Programs",
    to: "/programs",
  },
  {
    label: "News",
    to: "/news",
  },
  {
    label: "Entrance Information",
    to: "/academic/entrance-information",
  },
  {
    label: "Entrance Student Lists",
    to: "/academic/entrance-students",
  },
];

// ==================================================
// FOOTER LINK
// ==================================================

function FooterLink({ to, children }) {
  return (
    <Link
      as={RouterLink}
      to={to}
      color="inherit"
      fontSize="sm"
      textDecoration="none"
      transition="color 0.2s ease"
      _hover={{
        color: "#93C5FD",
        textDecoration: "none",
      }}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "#93C5FD",
        outlineOffset: "3px",
      }}
    >
      {children}
    </Link>
  );
}

// ==================================================
// MAIN FOOTER
// ==================================================

export default function Footer() {
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  const footerBg = isDark
    ? "#172C49"
    : "#172B45";

  const borderColor = isDark
    ? "#405772"
    : "#344A63";

  const mutedColor = "#B9CBE0";

  return (
    <Box
      as="footer"
      bg={footerBg}
      color="#F3F7FF"
      mt="16"
      borderTopWidth="1px"
      borderColor={borderColor}
      transition="background 0.2s ease"
    >
      <Container
        maxW="1280px"
        py={{ base: 10, md: 14 }}
      >
        <Grid
          templateColumns={{
            base: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "2fr 1fr 1fr 1fr",
          }}
          gap={{ base: 8, lg: 10 }}
        >
          {/* COLLEGE INFORMATION */}

          <GridItem>
            <Heading
              size="md"
              color="#FFFFFF"
              lineHeight="1.4"
            >
              Arakkha Computer College
            </Heading>

            <Text
              color={mutedColor}
              mt="4"
              maxW="380px"
              lineHeight="1.8"
              fontSize="sm"
            >
              Explore our academic programs,
              entrance announcements, college news,
              faculty and staff, and collaborations.
            </Text>
          </GridItem>

          {/* COLLEGE LINKS */}

          <GridItem>
            <Heading
              size="sm"
              mb="4"
              color="#FFFFFF"
            >
              College
            </Heading>

            <VStack
              align="start"
              gap="3"
            >
              {collegeLinks.map((link) => (
                <FooterLink
                  key={link.to}
                  to={link.to}
                >
                  {link.label}
                </FooterLink>
              ))}
            </VStack>
          </GridItem>

          {/* INFORMATION LINKS */}

          <GridItem>
            <Heading
              size="sm"
              mb="4"
              color="#FFFFFF"
            >
              Information
            </Heading>

            <VStack
              align="start"
              gap="3"
            >
              {informationLinks.map((link) => (
                <FooterLink
                  key={link.to}
                  to={link.to}
                >
                  {link.label}
                </FooterLink>
              ))}
            </VStack>
          </GridItem>

          {/* CONTACT */}

          <GridItem>
            <Heading
              size="sm"
              mb="4"
              color="#FFFFFF"
            >
              Contact
            </Heading>

            <VStack
              align="start"
              gap="3"
            >
              <FooterLink to="/contact">
                Contact Us
              </FooterLink>
            </VStack>
          </GridItem>
        </Grid>

        {/* COPYRIGHT */}

        <Box
          mt="12"
          pt="6"
          borderTopWidth="1px"
          borderColor={borderColor}
        >
          <Text
            textAlign="center"
            color={mutedColor}
            fontSize="sm"
          >
            © {new Date().getFullYear()} Arakkha
            Computer College. All rights reserved.
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
