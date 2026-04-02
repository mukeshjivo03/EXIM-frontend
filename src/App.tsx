import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { DailyPriceProvider } from "@/context/DailyPriceContext";
import { JivoRateProvider } from "@/context/JivoRateContext";
import { OpenGrpoProvider } from "@/context/OpenGrpoContext";
import OpenGrpoPage from "@/pages/contracts/OpenGrpoPage";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import DashboardPage from "@/pages/dashboard/DashboardPage";

// Dashboard
import StockDashboardPage from "@/pages/dashboard/StockDashboardPage";
import StockDashboardDetailPage from "@/pages/dashboard/StockDashboardDetailPage";

// Stock
import StockStatusPage from "@/pages/stock/StockStatusPage";
import TankItemsPage from "@/pages/stock/TankItemsPage";
import TankDataPage from "@/pages/stock/TankDataPage";
import TankMonitoringPage from "@/pages/stock/TankMonitoringPage";
import TankLogsPage from "@/pages/stock/TankLogsPage";

// Commodity
import DailyPricePage from "@/pages/commodity/DailyPricePage";
import JivoRatesPage from "@/pages/commodity/JivoRatesPage";

// Accounts
import EximAccountPage from "@/pages/accounts/EximAccountPage";

//custom Exchange
import CustomExchangeRatesPage from "@/pages/Custom-Exchange/CustomExchangeRatesPage";

// Contracts
import DomesticContracts2526Page from "@/pages/contracts/DomesticContracts2526Page";
import DomesticContracts2627Page from "@/pages/contracts/DomesticContracts2627Page";

// License
import AdvanceLicensePage from "@/pages/license/AdvanceLicensePage";
import AdvanceLicenseDetailPage from "@/pages/license/AdvanceLicenseDetailPage";
import DFIALicensePage from "@/pages/license/DFIALicensePage";
import DFIALicenseDetailPage from "@/pages/license/DFIALicenseDetailPage";

// Administration
import UsersPage from "@/pages/administration/UsersPage";
import SyncRawMaterialDataPage from "@/pages/administration/SyncRawMaterialDataPage";
import SyncFinishedGoodsDataPage from "@/pages/administration/SyncFinishedGoodsDataPage";
import SyncVendorDataPage from "@/pages/administration/SyncVendorDataPage";
import SyncLogsPage from "@/pages/administration/SyncLogsPage";
import StockUpdationLogsPage from "@/pages/administration/StockUpdationLogsPage";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <DailyPriceProvider>
        <JivoRateProvider>
        <OpenGrpoProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<HomePage />} />

            {/* ADM | MNG | FTR — Tank pages (view only for FTR) */}
            <Route path="/stock/tank-items" element={<TankItemsPage />} />
            <Route path="/stock/tank-monitoring" element={<TankMonitoringPage />} />
            <Route path="/stock/tank-data" element={<TankDataPage />} />
            <Route path="/stock/tank-logs" element={<TankLogsPage />} />

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
              path="/contracts/open-grpos"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <OpenGrpoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/domestic-contracts"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <DomesticContracts2526Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/domestic-2627"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <DomesticContracts2627Page />
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
              path="/license/dfia-license"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <DFIALicensePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/license/dfia-license/:fileNo"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <DFIALicenseDetailPage />
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
              path="/exim-rates"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <CustomExchangeRatesPage />
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
              path="/commodity/jivo-rates"
              element={
                <ProtectedRoute allowedRoles={["ADM", "MNG"]}>
                  <JivoRatesPage />
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
        </OpenGrpoProvider>
        </JivoRateProvider>
        </DailyPriceProvider>
      </AuthProvider>
    </BrowserRouter>
    <Toaster richColors position="bottom-right" />
    </ThemeProvider>
  );
}

export default App;
