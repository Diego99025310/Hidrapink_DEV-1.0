import { Outlet, useOutletContext } from "react-router-dom";
import { useState } from "react";
import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const outletContext = useOutletContext() || {};

  const toggleSidebar = () => setSidebarOpen((state) => !state);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar open={sidebarOpen} onNavigate={closeSidebar} />
      <div className="flex flex-1 flex-col md:pl-72">
        <Navbar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
