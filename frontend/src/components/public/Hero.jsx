import { Box, Button, Container, Flex, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

export default function Hero() {
  return (
    <Box bgGradient="to-br" gradientFrom="blue.800" gradientTo="blue.600" color="white">
      <Container maxW="1280px">
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap="12" minH={{ base: "600px", lg: "680px" }} alignItems="center">
          <VStack align="start" gap="6">
            <Text color="blue.200" fontWeight="900" letterSpacing="widest" textTransform="uppercase">
              Welcome to ACC
            </Text>
            <Heading size={{ base: "3xl", md: "5xl" }} lineHeight="1.05">
              Building the next generation of technology professionals.
            </Heading>
            <Text fontSize={{ base: "md", md: "xl" }} color="blue.100" maxW="680px" lineHeight="1.8">
              Explore our academic programs, student information, entrance announcements,
              faculty and staff, partnerships and the latest college news.
            </Text>
            <Flex gap="4" wrap="wrap">
              <Button as={RouterLink} to="/programs" size="lg" colorPalette="white">
                Explore Programs
              </Button>
              <Button as={RouterLink} to="/academic/entrance-list" size="lg" variant="outline" borderColor="whiteAlpha.700" color="white">
                Entrance List
              </Button>
            </Flex>
          </VStack>

          <Flex display={{ base: "none", lg: "flex" }} justify="center">
            <Box
              w="420px"
              h="420px"
              borderRadius="3xl"
              bg="whiteAlpha.100"
              borderWidth="1px"
              borderColor="whiteAlpha.300"
              p="10"
              backdropFilter="blur(12px)"
            >
              <VStack h="100%" justify="center" gap="6">
                <Box
                w="110px"
                h="110px"
                display="flex"
                alignItems="center"
                justifyContent="center"
               
              >
                <Box
                  as="img"
                  src="/logo.png"
                  w="100%"
                  h="100%"
                  objectFit="contain"
                />
              </Box>
                <Heading size="lg" textAlign="center">Arakkha Computer College</Heading>
                <Text textAlign="center" color="blue.100">
                  Knowledge · Technology · Innovation
                </Text>
              </VStack>
            </Box>
          </Flex>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
