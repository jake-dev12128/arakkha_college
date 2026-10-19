import { useOutletContext } from "react-router-dom";

import AdminOverview from "./AdminOverview.jsx";
import DashboardHome from "../../components/dashboard/DashboardHome.jsx";

export default function RoleDashboard() {
  const { user } = useOutletContext();

  if (["super_admin", "admin"].includes(user.role)) {
    return <AdminOverview />;
  }

  return <DashboardHome />;
}