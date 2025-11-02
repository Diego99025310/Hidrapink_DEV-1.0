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
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-brand-light bg-white/80 px-4 py-3 text-ink shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex items-center justify-center rounded-full border border-brand-light bg-white/70 p-2 text-brand transition hover:bg-brand/10 hover:text-brand md:hidden"
          aria-label="Alternar menu"
        >
          <IconMenu open={sidebarOpen} />
        </button>
        <div className="space-y-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-brand">
            HidraPink Influence Manager
          </span>
          <h1 className="font-display text-lg text-brand">Central Operacional</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden text-right md:block">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-brand/80">Usuário</p>
          <p className="font-display text-lg text-ink">
            {user?.name || user?.nome || user?.email || "Hidra Pink"}
          </p>
          <p className="text-xs font-body text-ink/60">
            {user?.role === "master" ? "Master" : "Influenciadora"}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-full bg-gradient-to-r from-brand via-brand-medium to-brand px-4 py-2 text-sm font-display uppercase tracking-[0.3em] text-white shadow-brand-soft transition hover:brightness-110"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
