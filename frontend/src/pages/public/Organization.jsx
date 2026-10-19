import { Box, Container, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import PageHero from "../../components/common/PageHero.jsx";

const units = [
  ["Principal / Rector", "College Leadership"],
  ["Academic Office", "Academic Management"],
  ["Administration", "Administrative Services"],
  ["Faculty Departments", "Teaching & Research"],
  ["Student Affairs", "Student Services"],
  ["Finance & Operations", "Operations"],
];

export default function Organization() {
  return (
    <>
      <PageHero title="Organization Chart" description="A structured overview of the college's administrative and academic units." />
      <Container maxW="1000px" py="16">
        <Flex direction="column" align="center" gap="4">
          <Box bg="blue.700" color="white" p="6" borderRadius="xl" textAlign="center" minW={{ base: "260px", md: "340px" }}>
            <Heading size="md">Principal / Rector</Heading>
            <Text mt="2" color="blue.100">College Leadership</Text>
          </Box>
          <Box h="50px" w="1px" bg="gray.300" />
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="5" w="100%">
            {units.slice(1).map(([title, subtitle]) => (
              <Box key={title} borderWidth="1px" borderColor="gray.200" borderRadius="xl" p="6" bg="white">
                <Heading size="sm">{title}</Heading>
                <Text mt="2" color="gray.500">{subtitle}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Flex>
      </Container>
    </>
  );
}
