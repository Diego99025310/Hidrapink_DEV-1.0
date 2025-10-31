import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, setError } = useAuth();
  const [formState, setFormState] = useState({
    email: "",
    password: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await login(formState.email, formState.password);
      navigate("/dashboard");
    } catch (authError) {
      console.error(authError);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-pink-900 via-slate-950 to-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(228,68,122,0.45),_transparent_60%)]" />
      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <section className="flex w-full flex-col justify-between gap-16 px-8 py-14 lg:w-1/2 lg:px-16 xl:px-24">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-pink-200">
              HidraPink Influence Manager
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-white lg:text-5xl">
              Transforme resultados com a{" "}
              <span className="bg-gradient-to-r from-pink-300 via-white to-pink-200 bg-clip-text text-transparent">
                sua rede de influenciadoras
              </span>
              .
            </h1>
            <p className="mt-6 max-w-xl text-base text-white/70 lg:text-lg">
              Faça login para acompanhar performance, programar roteiros e gerenciar vendas.
              O painel integra todos os fluxos operacionais da HidraPink em um só lugar.
            </p>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Suporte</p>
              <p className="mt-3 text-sm text-white/70">
                Esqueceu suas credenciais? Abra um chamado pelo canal oficial no Slack
                #hidrapink-suporte ou envie um e-mail para{" "}
                <span className="font-medium text-pink-200">suporte@hidrapink.com</span>.
              </p>
            </div>
          </div>
        </section>

        <section className="flex w-full items-center justify-center bg-slate-950/40 px-6 py-12 backdrop-blur lg:w-1/2 lg:px-16">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
            <header className="space-y-2 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-white">
                Acesso restrito
              </span>
              <h2 className="text-2xl font-semibold text-white">Entrar no painel</h2>
              <p className="text-xs text-white/60">
                Digite seu e-mail corporativo e senha cadastrada.
              </p>
            </header>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/80" htmlFor="email">
                  E-mail corporativo
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white shadow-inner transition focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/50"
                  placeholder="voce@hidrapink.com"
                  value={formState.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/80" htmlFor="password">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white shadow-inner transition focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/50"
                  placeholder="••••••"
                  value={formState.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {error ? (
                <p className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-lg transition hover:from-pink-400 hover:to-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300/60 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Validando acesso..." : "Entrar"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-white/50">
              Ao acessar você concorda com os termos de confidencialidade e uso interno da HidraPink.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
