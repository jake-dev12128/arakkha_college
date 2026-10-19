
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";

import { Link as RouterLink } from "react-router-dom";

import HeroSlideshow from "./HeroSlideshow.jsx";

export default function Hero() {
  return (
    <HeroSlideshow>
      <Container maxW="1280px" width="100%">
        <SimpleGrid
          columns={{ base: 1, lg: 2 }}
          gap={{ base: 8, lg: 12 }}
          alignItems="center"
        >
          <VStack align="start" gap="6">
            <Text
               color="#CBD5E1"

              fontWeight="900"
              letterSpacing="widest"
              textTransform="uppercase"
            >
              Welcome to ACC
            </Text>

            <Heading
              size={{ base: "3xl", md: "5xl" }}
              lineHeight="1.05"
              color="#F1F5F9"
            >
              Building the next generation of
              technology professionals.
            </Heading>

            <Text
              fontSize={{ base: "md", md: "xl" }}
              color="#CBD5E1"
              maxW="680px"
              lineHeight="1.8"
            >
              Explore our academic programs,
              student information, entrance
              announcements, faculty and staff,
              partnerships and the latest college news.
            </Text>

            <Flex gap="4" wrap="wrap">
              <Button
                as={RouterLink}
                to="/programs"
                size="lg"
                colorPalette="white"
              >
                Explore Programs
              </Button>

              <Button
                as={RouterLink}
                to="/academic/entrance-list"
                size="lg"
                variant="outline"
                borderColor="whiteAlpha.700"
                color="white"
                _hover={{
                  bg: "whiteAlpha.200",
                }}
              >
                Entrance List
              </Button>
            </Flex>
          </VStack>

          <Flex
            display={{ base: "none", lg: "flex" }}
            justify="center"
          >
            <Box
              w="420px"
              maxW="100%"
              h="420px"
              borderRadius="3xl"
              bg="rgba(255,255,255,0.10)"
              borderWidth="1px"
              borderColor="whiteAlpha.300"
              p="10"
              backdropFilter="blur(12px)"
            >
              <VStack
                h="100%"
                justify="center"
                gap="6"
              >
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

                <Heading
                  size="lg"
                  textAlign="center"
                  color="white"
                >
                  Arakkha Computer College
                </Heading>

                <Text
                  textAlign="center"
                  color="whiteAlpha.900"
                >
                  Knowledge · Technology · Innovation
                </Text>
              </VStack>
            </Box>
          </Flex>
        </SimpleGrid>
      </Container>
    </HeroSlideshow>
  );
}
