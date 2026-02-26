import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />
      <main
        className={`flex-1 pt-14 pb-12 transition-all duration-300 ${
          sidebarCollapsed ? "pl-16" : "pl-56"
        }`}
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
