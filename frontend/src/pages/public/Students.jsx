import { Container, Heading, Input, SimpleGrid, Box, Text, Button, VStack } from "@chakra-ui/react";
import { useState } from "react";
import PageHero from "../../components/common/PageHero.jsx";

const students = [
  { id: "ACC-2026-001", name: "Student Example", program: "Computer Science", year: "2026" },
  { id: "ACC-2026-002", name: "Student Example", program: "Software Engineering", year: "2026" },
];

export default function Students() {
  const [query, setQuery] = useState("");
  const filtered = students.filter((s) => s.id.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <PageHero title="Student Information" description="Search student information using an approved public identifier." />
      <Container maxW="900px" py="16">
        <VStack align="stretch" gap="5">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Student ID or Name" size="lg" bg="white" />
          <Button colorPalette="blue" alignSelf="start">Search</Button>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="5" mt="5">
            {filtered.map((student) => (
              <Box key={student.id} borderWidth="1px" borderRadius="xl" p="6" bg="white">
                <Heading size="sm">{student.name}</Heading>
                <Text mt="3" color="gray.600">Student ID: {student.id}</Text>
                <Text color="gray.600">Program: {student.program}</Text>
                <Text color="gray.600">Academic Year: {student.year}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    </>
  );
}
