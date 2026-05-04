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
import WarehouseInventoryPage from "@/pages/stock/WarehouseInventoryPage";
import ShortageReportPage from "@/pages/stock/ShortageReportPage";
import VehicleReportPage from "@/pages/reports/VehicleReportPage";
import DirectorDashboardPage from "@/pages/reports/DirectorDashboardPage";

// Commodity
import DailyPricePage from "@/pages/commodity/DailyPricePage";
import JivoRatesPage from "@/pages/commodity/JivoRatesPage";

// Accounts
import EximAccountPage from "@/pages/accounts/CrDrOutstandingPage";
import EximAccountVendorPage from "@/pages/accounts/EximAccountVendorPage";
import OpenApsPage from "@/pages/accounts/OpenApsPage";
import CustomerOutstandingPage from "@/pages/accounts/CustomerOutstandingPage";

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
import InstallPWA from "@/components/InstallPWA";

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

            {/* Tank pages */}
            <Route
              path="/stock/warehouse-inventory"
              element={
                <ProtectedRoute requiredModules={["inventory", "stockstatus"]}>
                  <WarehouseInventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/vehicle-report"
              element={
                <ProtectedRoute requiredModules={["vehicle_report"]}>
                  <VehicleReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/director-dashboard"
              element={
                <ProtectedRoute requiredModules={["director_report", "director_inventory", "director_inventorty", "domesticreports"]}>
                  <DirectorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/tank-items"
              element={
                <ProtectedRoute requiredModules={["tankitem"]}>
                  <TankItemsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/tank-monitoring"
              element={
                <ProtectedRoute requiredModules={["tankdata", "tanklayer"]}>
                  <TankMonitoringPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/tank-data"
              element={
                <ProtectedRoute requiredModules={["tankdata"]}>
                  <TankDataPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/tank-logs"
              element={
                <ProtectedRoute requiredModules={["tanklog"]}>
                  <TankLogsPage />
                </ProtectedRoute>
              }
            />

            {/* Permission-protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredModules={["domesticreports", "stockstatus"]}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-dashboard"
              element={
                <ProtectedRoute requiredModules={["stockstatus"]}>
                  <StockDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-dashboard/:status"
              element={
                <ProtectedRoute requiredModules={["stockstatus"]}>
                  <StockDashboardDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/stock-status"
              element={
                <ProtectedRoute requiredModules={["stockstatus"]}>
                  <StockStatusPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/variance"
              element={
                <ProtectedRoute requiredModules={["stockstatus"]}>
                  <ShortageReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/open-grpos"
              element={
                <ProtectedRoute requiredModules={["open_grpos"]}>
                  <OpenGrpoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/domestic-contracts"
              element={
                <ProtectedRoute requiredModules={["domesticcontract"]}>
                  <DomesticContracts2526Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/domestic-2627"
              element={
                <ProtectedRoute requiredModules={["domesticcontract"]}>
                  <DomesticContracts2627Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/license/advance-license"
              element={
                <ProtectedRoute requiredModules={["advancelicenseheaders"]}>
                  <AdvanceLicensePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/license/advance-license/:licenseNo"
              element={
                <ProtectedRoute requiredModules={["advancelicenseheaders"]}>
                  <AdvanceLicenseDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/license/dfia-license"
              element={
                <ProtectedRoute requiredModules={["dfialicenseheader"]}>
                  <DFIALicensePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/license/dfia-license/:fileNo"
              element={
                <ProtectedRoute requiredModules={["dfialicenseheader"]}>
                  <DFIALicenseDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exim-account"
              element={
                <ProtectedRoute requiredModules={["debitentry", "party"]}>
                  <EximAccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exim-account/:vendorCode"
              element={
                <ProtectedRoute requiredModules={["debitentry", "party"]}>
                  <EximAccountVendorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/open-aps"
              element={
                <ProtectedRoute>
                  <OpenApsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts/customer-outstanding"
              element={
                <ProtectedRoute requiredModules={["customer_balance_sheet"]}>
                  <CustomerOutstandingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exim-rates"
              element={
                <ProtectedRoute requiredModules={["exim_rates"]}>
                  <CustomExchangeRatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commodity/daily-price"
              element={
                <ProtectedRoute requiredModules={["dailyprice"]}>
                  <DailyPricePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commodity/jivo-rates"
              element={
                <ProtectedRoute requiredModules={["jivorates"]}>
                  <JivoRatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/stock-updation-logs"
              element={
                <ProtectedRoute requiredModules={["stockstatusupdatelog"]}>
                  <StockUpdationLogsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin only — User management, Sync operations */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredModules={["user"]}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sync-raw-material-data"
              element={
                <ProtectedRoute requiredModules={["rmproducts"]}>
                  <SyncRawMaterialDataPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sync-finished-goods-data"
              element={
                <ProtectedRoute requiredModules={["fgproducts"]}>
                  <SyncFinishedGoodsDataPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sync-vendor-data"
              element={
                <ProtectedRoute requiredModules={["party"]}>
                  <SyncVendorDataPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sync-logs"
              element={
                <ProtectedRoute requiredModules={["synclogs"]}>
                  <SyncLogsPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
        <InstallPWA />
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
