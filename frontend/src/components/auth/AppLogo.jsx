import { Image } from "@chakra-ui/react";

function AppLogo({ size = "150px" }) {
  return (
    <Image
      src="/logo.png"
      alt="App Logo"
      width={size}
      height={size}
      objectFit="contain"
    />
  );
}

export default AppLogo;