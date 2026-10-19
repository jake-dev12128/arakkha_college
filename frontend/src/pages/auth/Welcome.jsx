import { useNavigate } from "react-router-dom";

import {
  Box,
  Button,
  Card,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";

import AppLogo from "../../components/auth/AppLogo.jsx";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <Box
      minH="100vh"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      py={8}
    >
      <VStack w="full" maxW="430px" gap={5}>
        <AppLogo size="100px" />

        <Card.Root
          w="full"
          bg="white"
          border="1px solid"
          borderColor="gray.100"
          borderRadius="20px"
          boxShadow="0 12px 40px rgba(0,0,0,0.08)"
        >
          <Card.Body p={{ base: 6, md: 8 }}>
            <VStack gap={6}>
              <Box textAlign="center">
                <Heading size="xl" fontWeight="700">
                  ACC Computer College
                </Heading>

                <Text mt={2} color="gray.500" fontSize="sm">
                  College Management System
                </Text>
              </Box>

              <Button
                w="full"
                size="lg"
                borderRadius="12px"
                colorPalette="blue"
                onClick={() => navigate("/acc/auth/login")}
              >
                Login
              </Button>

              <Text
                color="gray.500"
                fontSize="sm"
                textAlign="center"
              >
                Accounts are created by authorized
                college administrators.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Box>
  );
}