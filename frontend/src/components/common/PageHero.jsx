
import {
  Container,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";

import HeroSlideshow from "../public/HeroSlideshow.jsx";

export default function PageHero({
  title,
  description,
}) {
  return (
    <HeroSlideshow>
      <Container maxW="1280px" width="100%">
        <VStack
          align="start"
          gap={3}
          maxW="800px"
        >
          <Heading
            size={{ base: "2xl", md: "4xl" }}
            color="white"
            lineHeight="1.15"
          >
            {title}
          </Heading>

          {description && (
            <Text
              mt={2}
              maxW="720px"
              color="whiteAlpha.900"
              fontSize={{ base: "md", md: "lg" }}
              lineHeight="1.7"
            >
              {description}
            </Text>
          )}
        </VStack>
      </Container>
    </HeroSlideshow>
  );
}
