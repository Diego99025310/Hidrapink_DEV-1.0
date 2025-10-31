import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import termoHtml from "../assets/termo-parceria.html?raw";

const sanitizeCode = (value) => value.replace(/\D/g, "").slice(0, 6);

export default function TermsPage() {
  const { user } = useAuth();
  const outletContext = useOutletContext() || {};
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [dispensed, setDispensed] = useState(false);
  const [checkbox, setCheckbox] = useState(false);
  const [codeEnabled, setCodeEnabled] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const { data } = await api.get("/api/verificar-aceite");
        const dispensa = Boolean(data?.dispensado);
        const aceite = Boolean(data?.aceito);
        setAccepted(aceite || dispensa);
        setDispensed(dispensa);
        if (aceite || dispensa) {
          setMessage({
            type: "success",
            text: "Termo de parceria já aceito. Você pode acessar o painel normalmente.",
          });
        }
      } catch (error) {
        if (error.response?.status === 428) {
          setAccepted(false);
        } else if (error.response?.status === 401) {
          setMessage({
            type: "error",
            text: "Sessão expirada. Faça login novamente para continuar.",
          });
        } else {
          setMessage({
            type: "error",
            text:
              error.response?.data?.error ||
              "Nao foi possivel verificar o status do termo de parceria.",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "influencer") {
      loadStatus();
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  const handleRequestCode = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const { data } = await api.post("/api/enviar-token", {});
      setCodeEnabled(true);
      setMessage({
        type: "success",
        text:
          data?.message ||
          "Código validado pela equipe HidraPink. Insira o código de 6 dígitos informado para concluir.",
      });
    } catch (error) {
      if (error.response?.status === 200) {
        setMessage({
          type: "success",
          text: error.response?.data?.message || "Termo já aceito anteriormente.",
        });
        setAccepted(true);
        outletContext.refreshTerms?.();
        navigate("/dashboard", { replace: true });
        return;
      }
      setMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel validar sua elegibilidade. Contate a equipe HidraPink.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateCode = async () => {
    const sanitized = sanitizeCode(code);
    if (sanitized.length !== 6) {
      setMessage({
        type: "error",
        text: "Informe o código de assinatura com 6 dígitos.",
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const { data } = await api.post("/api/validar-token", { codigo: sanitized });
      setAccepted(true);
      setMessage({
        type: "success",
        text: data?.message || "Termo aceito com sucesso! Redirecionando...",
      });
      outletContext.refreshTerms?.();
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1200);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel validar o código informado. Verifique e tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  if (user.role !== "influencer") {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/70">
        O fluxo de aceite está disponível apenas para influenciadoras. Acesse o dashboard para
        gerenciar as operações.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">
            Carregando termo de parceria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">
          Termo de Parceria HidraPink
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          Leia o termo com atenção e confirme com o código de assinatura
        </h1>
      </header>

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
              : "border-rose-300/40 bg-rose-500/10 text-rose-100"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/95 p-6 text-slate-900 shadow-inner">
          <div dangerouslySetInnerHTML={{ __html: termoHtml }} />
        </div>
        <label className="mt-6 flex items-start gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={checkbox}
            onChange={(event) => setCheckbox(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950/40"
            disabled={accepted || dispensed}
          />
          <span>
            Confirmo que li integralmente o termo acima e estou ciente das regras de parceria com a
            HidraPink.
          </span>
        </label>

        {!accepted && !dispensed ? (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleRequestCode}
              disabled={!checkbox || submitting}
              className="rounded-full bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:from-pink-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Processando..." : "Validar elegibilidade"}
            </button>

            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                placeholder="Código de assinatura"
                value={code}
                onChange={(event) => setCode(sanitizeCode(event.target.value))}
                disabled={!codeEnabled || submitting}
                className="w-48 rounded-2xl border border-white/15 bg-slate-950/60 px-3 py-2 text-center text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
              />
              <button
                type="button"
                onClick={handleValidateCode}
                disabled={!codeEnabled || submitting || code.length !== 6}
                className="rounded-full border border-emerald-300/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirmar código
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
            Parabéns! O termo está regularizado. Você já pode utilizar todos os recursos do painel
            HidraPink.
          </p>
        )}
      </section>
    </div>
  );
}
