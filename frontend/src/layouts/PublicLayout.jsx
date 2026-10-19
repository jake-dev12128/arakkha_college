import { Outlet } from "react-router-dom";
import Navbar from "../components/public/Navbar.jsx";
import Footer from "../components/public/Footer.jsx";

export default function PublicLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
