import { Button, Container, Heading, Text, VStack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

export default function NotFound() {
  return (
    <Container maxW="800px" py="24">
      <VStack gap="5">
        <Heading>404</Heading>
        <Text color="gray.600">The page you are looking for does not exist.</Text>
        <Button as={RouterLink} to="/" colorPalette="blue">Back to Home</Button>
      </VStack>
    </Container>
  );
}
