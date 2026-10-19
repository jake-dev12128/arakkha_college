import { Box, Container, Heading, Text } from "@chakra-ui/react";

export default function PageHero({ title, description }) {
  return (
    <Box bg="blue.700" color="white">
      <Container maxW="1280px" py={{ base: "14", md: "20" }}>
        <Text textTransform="uppercase" letterSpacing="widest" fontSize="sm" fontWeight="800" color="blue.200">
          ACC Computer College
        </Text>
        <Heading size={{ base: "2xl", md: "4xl" }} mt="3">
          {title}
        </Heading>
        {description && (
          <Text mt="4" maxW="720px" color="blue.100" fontSize={{ base: "md", md: "lg" }}>
            {description}
          </Text>
        )}
      </Container>
    </Box>
  );
}
