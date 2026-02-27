import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import UsersPage from "@/pages/UsersPage";
import SyncVendorDataPage from "@/pages/SyncVendorDataPage";
import SyncRawMaterialDataPage from "@/pages/SyncRawMaterialDataPage";
import SyncFinishedGoodsDataPage from "@/pages/SyncFinishedGoodsDataPage";
import SyncLogsPage from "@/pages/SyncLogsPage";
import TankItemsPage from "@/pages/TankItemsPage";
import TankDataPage from "@/pages/TankDataPage";
import TankMonitoringPage from "@/pages/TankMonitoringPage";
import HomePage from "@/pages/HomePage";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/stock/tank-items"
              element={
                <ProtectedRoute allowedRoles={["ADM"]}>
                  <TankItemsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/tank-monitoring"
              element={
                <ProtectedRoute allowedRoles={["ADM"]}>
                  <TankMonitoringPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/tank-data"
              element={
                <ProtectedRoute allowedRoles={["ADM"]}>
                  <TankDataPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={["ADM"]}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sync-raw-material-data"
              element={
                <ProtectedRoute allowedRoles={["ADM"]}>
                  <SyncRawMaterialDataPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sync-finished-goods-data"
              element={
                <ProtectedRoute allowedRoles={["ADM"]}>
                  <SyncFinishedGoodsDataPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sync-vendor-data"
              element={
                <ProtectedRoute allowedRoles={["ADM"]}>
                  <SyncVendorDataPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sync-logs"
              element={
                <ProtectedRoute allowedRoles={["ADM"]}>
                  <SyncLogsPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    <Toaster richColors position="bottom-right" />
    </ThemeProvider>
  );
}

export default App;
