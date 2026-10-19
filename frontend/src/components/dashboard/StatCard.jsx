
import {
  Box,
  Flex,
  Text,
  Spinner,
} from "@chakra-ui/react";

export default function StatCard({
  title,
  value,
  icon: Icon,
  loading = false,
}) {
  return (
    <Box
      bg="bg.panel"
      borderWidth="1px"
      borderRadius="xl"
      p={5}
      shadow="sm"
    >
      <Flex
        justify="space-between"
        align="start"
        gap={4}
      >
        <Box>
          <Text
            fontSize="sm"
            color="fg.muted"
            mb={2}
          >
            {title}
          </Text>

          {loading ? (
            <Spinner size="md" />
          ) : (
            <Text
              fontSize="3xl"
              fontWeight="800"
            >
              {value ?? "—"}
            </Text>
          )}
        </Box>

        {Icon && (
          <Box
            bg="blue.subtle"
            color="blue.fg"
            p={3}
            borderRadius="lg"
          >
            <Icon size={22} />
          </Box>
        )}
      </Flex>
    </Box>
  );
}
