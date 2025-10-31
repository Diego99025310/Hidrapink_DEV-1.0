import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayout from "./components/AppLayout.jsx";
import LoginPage from "./pages/Login.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import PlannerPage from "./pages/Planner.jsx";
import SalesPage from "./pages/Sales.jsx";
import TermsPage from "./pages/Terms.jsx";
import InfluencersPage from "./pages/Influencers.jsx";
import UnauthorizedPage from "./pages/Unauthorized.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/terms" element={<TermsPage />} />

          <Route element={<ProtectedRoute allowedRoles={["master"]} />}>
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/influencers" element={<InfluencersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
