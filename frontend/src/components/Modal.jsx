import { useEffect } from "react";

export default function Modal({
  isOpen,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  onClose,
  showActions = true,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-white/60">{description}</p>
          ) : null}
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 text-sm text-white/80">
          {children}
        </div>

        {showActions && (primaryAction || secondaryAction || onClose) && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
            {secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                {secondaryAction.label}
              </button>
            ) : null}

            <button
              type={primaryAction?.type ?? "button"}
              form={primaryAction?.form}
              onClick={primaryAction?.onClick ?? onClose}
              disabled={primaryAction?.disabled}
              className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow transition ${
                primaryAction?.disabled
                  ? "bg-pink-500/40 cursor-not-allowed"
                  : "bg-pink-500 hover:bg-pink-400"
              }`}
            >
              {primaryAction?.loading
                ? primaryAction?.loadingLabel ?? "Carregando..."
                : primaryAction?.label ?? "Fechar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
