import { NavLink, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const navItemStyle =
  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition";

const baseItems = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: (
      <svg
        className="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 13h18" />
        <path d="M17 21V9" />
        <path d="M7 21V5" />
        <path d="M12 21V3" />
      </svg>
    ),
  },
  {
    label: "Planner",
    to: "/planner",
    icon: (
      <svg
        className="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
      </svg>
    ),
  },
];

const masterItems = [
  {
    label: "Vendas",
    to: "/sales",
    icon: (
      <svg
        className="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 7h-9" />
        <path d="M14 17H5" />
        <circle cx="17" cy="17" r="3" />
        <circle cx="7" cy="7" r="3" />
      </svg>
    ),
  },
  {
    label: "Influenciadoras",
    to: "/influencers",
    icon: (
      <svg
        className="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 6a3 3 0 1 0-3-3 3 3 0 0 0 3 3" />
        <path d="M16.5 21v-2a4.5 4.5 0 0 0-9 0v2" />
        <path d="M19 7a2 2 0 0 1 2 2" />
        <path d="M21 13a2 2 0 0 1-2 2" />
        <path d="M3 9a2 2 0 0 1 2-2" />
        <path d="M5 15a2 2 0 0 1-2-2" />
      </svg>
    ),
  },
];

const sharedItems = [
  {
    label: "Termos",
    to: "/terms",
    icon: (
      <svg
        className="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 2h10" />
        <path d="M17 2v18l-5-3-5 3V2" />
      </svg>
    ),
  },
];

export default function Sidebar({ open, onNavigate }) {
  const { user } = useAuth();
  const location = useLocation();

  const items = useMemo(() => {
    const list = [...baseItems];
    if (user?.role === "master") {
      list.push(...masterItems);
    }
    list.push(...sharedItems);
    return list;
  }, [user?.role]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-72 transform border-r border-white/10 bg-slate-950/80 backdrop-blur transition-transform md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full md:-translate-x-0"
      }`}
    >
      <div className="flex h-20 items-center border-b border-white/10 px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-pink-200">HidraPink</p>
          <p className="text-lg font-semibold text-white">Influence Manager</p>
        </div>
      </div>
      <nav className="space-y-1 px-4 py-6">
        {items.map((item) => {
          const active = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onNavigate?.()}
              className={`${navItemStyle} ${
                active
                  ? "bg-white/15 text-white shadow"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
