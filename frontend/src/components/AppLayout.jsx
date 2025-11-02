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
    <div className="relative flex min-h-screen bg-gradient-to-br from-brand-light/70 via-white to-brand-medium/20 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(228,68,122,0.12),_transparent_55%)]" />
      <Sidebar open={sidebarOpen} onNavigate={closeSidebar} />
      <div className="relative z-10 flex flex-1 flex-col md:pl-72">
        <Navbar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
