import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  Center,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useAuth } from "@clerk/react";

import {
  getSafeReturnUrl,
} from "../../utils/courseReturnUrl.js";

export default function GuestRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <Center minH="100vh">
        <VStack gap={4}>
          <Spinner size="xl" />
          <Text>Checking authentication...</Text>
        </VStack>
      </Center>
    );
  }

  if (isSignedIn) {
    return (
      <Navigate
        to={getSafeReturnUrl(location.search)}
        replace
      />
    );
  }

  return <Outlet />;
}