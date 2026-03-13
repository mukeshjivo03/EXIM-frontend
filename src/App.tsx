import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { DailyPriceProvider } from "@/context/DailyPriceContext";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import UsersPage from "@/pages/UsersPage";
import SyncVendorDataPage from "@/pages/SyncVendorDataPage";
import SyncRawMaterialDataPage from "@/pages/SyncRawMaterialDataPage";
import SyncFinishedGoodsDataPage from "@/pages/SyncFinishedGoodsDataPage";
import SyncLogsPage from "@/pages/SyncLogsPage";
import StockUpdationLogsPage from "@/pages/StockUpdationLogsPage";
import TankItemsPage from "@/pages/TankItemsPage";
import TankDataPage from "@/pages/TankDataPage";
import TankMonitoringPage from "@/pages/TankMonitoringPage";
import StockStatusPage from "@/pages/StockStatusPage";
import StockDashboardPage from "@/pages/StockDashboardPage";
import DashboardPage from "@/pages/DashboardPage";
import EximAccountPage from "@/pages/EximAccountPage";
import DomesticContractsPage from "@/pages/DomesticContractsPage";
import DailyPricePage from "@/pages/DailyPricePage";
import AdvanceLicensePage from "@/pages/AdvanceLicensePage";
import AdvanceLicenseDetailPage from "@/pages/AdvanceLicenseDetailPage";
import StockDashboardDetailPage from "@/pages/StockDashboardDetailPage";
import HomePage from "@/pages/HomePage";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <DailyPriceProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<HomePage />} />

            {/* ADM | MNG | FTR — Tank pages (view only for FTR) */}
            <Route path="/stock/tank-items" element={<TankItemsPage />} />
            <Route path="/stock/tank-monitoring" element={<TankMonitoringPage />} />
            <Route path="/stock/tank-data" element={<TankDataPage />} />

            {/* ADM | MNG — Dashboard, Stock, Accounts, Contracts, License, Daily Price */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-dashboard"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <StockDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-dashboard/:status"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <StockDashboardDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/stock-status"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <StockStatusPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/domestic-contracts"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <DomesticContractsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/license/advance-license"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <AdvanceLicensePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/license/advance-license/:licenseNo"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <AdvanceLicenseDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exim-account"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <EximAccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commodity/daily-price"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <DailyPricePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/stock-updation-logs"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <StockUpdationLogsPage />
                </ProtectedRoute>
              }
            />

            {/* ADM only — User management, Sync operations */}
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
        </DailyPriceProvider>
      </AuthProvider>
    </BrowserRouter>
    <Toaster richColors position="bottom-right" />
    </ThemeProvider>
  );
}

export default App;
