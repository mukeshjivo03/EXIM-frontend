import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <Sidebar />
      <main className="flex-1 pt-14 pb-12 pl-56">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
