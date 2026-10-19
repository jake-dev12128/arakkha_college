
import {
  Card,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useParams } from "react-router-dom";

import {
  getDashboardConfig,
} from "../../config/dashboardMenus.js";

import { useOutletContext } from "react-router-dom";

export default function FeaturePage() {
  const { feature } = useParams();
  const { user } = useOutletContext();

  const config = getDashboardConfig(user.role);

  const entry = config?.sections
    .flatMap((section) => section.items)
    .find((item) => item.path === `/acc/auth/${feature}`);

  if (!entry) {
    return (
      <Text color="red.600">
        You do not have access to this feature.
      </Text>
    );
  }

  return (
    <VStack align="stretch" gap={5}>
      <Heading size="xl">{entry.label}</Heading>

      <Card.Root>
        <Card.Body>
          <Text color="fg.muted">
            This module is not connected yet.
            Data and actions will be available after
            the backend API and permission checks
            are implemented.
          </Text>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}
