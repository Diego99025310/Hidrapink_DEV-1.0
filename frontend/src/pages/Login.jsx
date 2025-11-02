import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const sanitizeIdentifier = (value) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const containsLetters = /[A-Za-z]/.test(trimmed);
  if (trimmed.includes("@") || containsLetters) {
    return trimmed.toLowerCase();
  }
  return trimmed.replace(/\D/g, "");
};

const formatPhoneInput = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) {
    return `(${digits}`;
  }
  const area = digits.slice(0, 2);
  if (digits.length <= 6) {
    return `(${area}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    const middle = digits.slice(2, digits.length - 4);
    const end = digits.slice(-4);
    return `(${area}) ${middle}-${end}`;
  }
  const middle = digits.slice(2, 7);
  const end = digits.slice(7);
  return `(${area}) ${middle}-${end}`;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, setError } = useAuth();
  const [identifierInput, setIdentifierInput] = useState("");
  const [password, setPassword] = useState("");

  const isEmailMode = useMemo(() => {
    if (!identifierInput) return false;
    return identifierInput.includes("@") || /[A-Za-z]/.test(identifierInput);
  }, [identifierInput]);

  const handleIdentifierChange = (event) => {
    const { value } = event.target;
    if (isEmailMode || value.includes("@") || /[A-Za-z]/.test(value)) {
      setIdentifierInput(value.trimStart());
    } else {
      setIdentifierInput(formatPhoneInput(value));
    }
    if (error) {
      setError(null);
    }
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const identifier = sanitizeIdentifier(identifierInput);
    if (!identifier) {
      setError("Informe email ou celular.");
      return;
    }
    if (!password.trim()) {
      setError("Informe a senha.");
      return;
    }

    try {
      await login(identifier, password);
      navigate("/dashboard");
    } catch (authError) {
      console.error(authError);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-light via-white to-brand-medium/10 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(228,68,122,0.12),_transparent_60%)]" />
      <div className="relative z-10 flex min-h-screen flex-col gap-12 lg:flex-row">
        <section className="flex w-full flex-col justify-between px-8 py-14 lg:w-1/2 lg:px-20">
          <header className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-brand">
              HidraPink Influence Manager
            </span>
            <h1 className="font-display text-4xl leading-tight text-brand lg:text-5xl">
              Potencialize sua rede de influenciadoras
            </h1>
            <p className="max-w-xl text-base text-ink/70 lg:text-lg">
              Faça login para planejar conteúdos, acompanhar performance e reforçar o protagonismo das parceiras HidraPink.
            </p>
          </header>

          <aside className="hidden lg:block">
            <div className="rounded-3xl border border-brand-light bg-white/80 p-6 text-ink shadow-brand-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">Suporte</p>
              <p className="mt-3 text-sm text-ink/70">
                Esqueceu suas credenciais? Abra um chamado pelo canal #hidrapink-suporte ou envie um e-mail para{" "}
                <span className="font-semibold text-brand">suporte@hidrapink.com</span>.
              </p>
            </div>
          </aside>
        </section>

        <section className="flex w-full items-center justify-center px-6 pb-16 lg:w-1/2 lg:px-20">
          <div className="w-full max-w-md rounded-[2.5rem] border border-brand-light bg-white/90 p-10 shadow-brand backdrop-blur">
            <header className="space-y-3 text-center text-ink">
              <span className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-white">
                Acesso restrito
              </span>
              <h2 className="font-display text-3xl text-brand">Entrar no painel</h2>
              <p className="text-xs text-ink/60">
                Use seu e-mail corporativo ou celular com DDD e senha cadastrada.
              </p>
            </header>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2 text-left">
                <label className="block text-sm font-semibold uppercase tracking-[0.2em] text-brand" htmlFor="identifier">
                  E-mail ou celular
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  inputMode={isEmailMode ? "email" : "tel"}
                  className="w-full rounded-2xl border border-brand-light bg-white px-4 py-3 text-sm text-ink shadow-inner transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-medium/40"
                  placeholder="usuario@hidrapink.com ou (11) 98888-7777"
                  value={identifierInput}
                  onChange={handleIdentifierChange}
                  required
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="block text-sm font-semibold uppercase tracking-[0.2em] text-brand" htmlFor="password">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-brand-light bg-white px-4 py-3 text-sm text-ink shadow-inner transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-medium/40"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              {error ? (
                <p className="rounded-2xl border border-brand-medium/60 bg-brand-medium/15 px-4 py-3 text-sm text-brand">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-brand via-brand-medium to-brand px-4 py-3 text-sm font-display uppercase tracking-[0.3em] text-white shadow-brand transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-brand-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Validando acesso..." : "Entrar"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-ink/60">
              Ao acessar você concorda com os termos de confidencialidade HidraPink.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
