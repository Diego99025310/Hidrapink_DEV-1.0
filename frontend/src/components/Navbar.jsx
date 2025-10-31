import { useAuth } from "../context/AuthContext.jsx";

const IconMenu = ({ open }) =>
  open ? (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  ) : (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" x2="21" y1="6" y2="6" />
      <line x1="3" x2="21" y1="12" y2="12" />
      <line x1="3" x2="21" y1="18" y2="18" />
    </svg>
  );

export default function Navbar({ onToggleSidebar, sidebarOpen }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10 md:hidden"
          aria-label="Alternar menu"
        >
          <IconMenu open={sidebarOpen} />
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-pink-200">
            HidraPink Influence Manager
          </p>
          <h1 className="text-lg font-semibold text-white">Central Operacional</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden text-right md:block">
          <p className="text-xs uppercase tracking-[0.25em] text-white/60">Usuario</p>
          <p className="text-sm font-medium text-white">
            {user?.name || user?.nome || user?.email || "Hidra Pink"}
          </p>
          <p className="text-xs text-white/50">
            {user?.role === "master" ? "Master" : "Influenciadora"}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-white hover:text-pink-700"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
