import { Routes, Route } from "react-router-dom";
import RequireAuth from "@/components/RequireAuth";
import HomeRedirect from "@/pages/HomeRedirect";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import NewKitPage from "@/pages/NewKitPage";
import KitDetailPage from "@/pages/KitDetailPage";
import PracticePage from "@/pages/PracticePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/kits/new"
        element={
          <RequireAuth>
            <NewKitPage />
          </RequireAuth>
        }
      />
      <Route
        path="/kits/:id"
        element={
          <RequireAuth>
            <KitDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/kits/:id/practice"
        element={
          <RequireAuth>
            <PracticePage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
