import { Box, Heading, Text } from "@chakra-ui/react";

export default function SectionTitle({ eyebrow, title, description }) {
  return (
    <Box mb="10">
      {eyebrow && (
        <Text color="blue.600" fontWeight="800" textTransform="uppercase" letterSpacing="wider" fontSize="sm">
          {eyebrow}
        </Text>
      )}
      <Heading size={{ base: "xl", md: "2xl" }} mt="2">
        {title}
      </Heading>
      {description && (
        <Text color="gray.600" mt="3" maxW="720px" lineHeight="1.8">
          {description}
        </Text>
      )}
    </Box>
  );
}
