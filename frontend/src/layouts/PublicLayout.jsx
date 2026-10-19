import { Box } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";

import Navbar from "../components/public/Navbar.jsx";
import Footer from "../components/public/Footer.jsx";

export default function PublicLayout() {
  return (
    <Box
      className="acc-public"
      minH="100vh"
      display="flex"
      flexDirection="column"
    >
      <Navbar />

      <Box
        as="main"
        className="acc-public-main"
        flex="1"
      >
        <Outlet />
      </Box>

      <Footer />
    </Box>
  );
}