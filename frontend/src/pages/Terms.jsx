import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import Modal from "../components/Modal.jsx";

const formatCpf = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9)];
  if (digits.length <= 3) return parts[0];
  if (digits.length <= 6) return `${parts[0]}.${parts[1]}`;
  if (digits.length <= 9) return `${parts[0]}.${parts[1]}.${parts[2]}`;
  return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`;
};

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const area = digits.slice(0, 2);
  if (digits.length <= 7) {
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

const digitsLength = (value) => value.replace(/\D/g, "").length;

export default function TermsAcceptancePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState({ html: "", hash: "", version: "" });
  const [status, setStatus] = useState({ accepted: false, waived: false, fetched: false });
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const canSubmit = useMemo(() => {
    if (!agree) return false;
    if (digitsLength(cpf) !== 11) return false;
    if (digitsLength(telefone) !== 11) return false;
    return true;
  }, [agree, cpf, telefone]);

  useEffect(() => {
    const loadData = async () => {
      if (!user || user.role !== "influencer") {
        setLoading(false);
        return;
      }
      try {
        const { data: statusData } = await api.get("/api/aceite/status");
        const accepted = Boolean(statusData?.waived || statusData?.accepted);
        setStatus({
          accepted,
          waived: Boolean(statusData?.waived),
          fetched: true,
        });

        if (accepted) {
          setMessage({
            type: "success",
            text: statusData?.waived
              ? "Seu acesso foi liberado pelo administrador. Voce pode usar o painel normalmente."
              : "Termo de parceria aceito. Voce pode utilizar o painel normalmente.",
          });
          return;
        }

        const { data: contractData } = await api.get("/api/aceite/termo");
        setContract({
          html: contractData?.html ?? "",
          hash: contractData?.hash ?? "",
          version: contractData?.version ?? "",
        });
      } catch (requestError) {
        if (requestError.response?.status === 428 && requestError.response?.data?.waived) {
          setStatus({ accepted: true, waived: true, fetched: true });
          setMessage({
            type: "success",
            text: "Dispensa registrada. Voce pode acessar o painel normalmente.",
          });
        } else if (requestError.response?.status === 401) {
          setError("Sessao expirada. Faca login novamente para continuar.");
        } else {
          setError(
            requestError.response?.data?.error ||
              "Nao foi possivel carregar o termo. Tente novamente ou contate o suporte.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleConfirm = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const { data } = await api.post("/api/aceite/confirmar", {
        cpf,
        telefone,
      });
      setStatus({ accepted: true, waived: false, fetched: true });
      setMessage({
        type: "success",
        text: data?.message || "Aceite confirmado com sucesso. Redirecionando para o dashboard...",
      });
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1200);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Nao foi possivel confirmar o aceite. Verifique os dados e tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post("/api/aceite/rejeitar");
      setShowRejectModal(false);
      setMessage({
        type: "info",
        text:
          data?.message ||
          "Recusa registrada. Voce sera desconectada e nao podera usar o painel enquanto nao aceitar o termo.",
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      logout();
      navigate("/login", { replace: true });
    } catch (requestError) {
      setShowRejectModal(false);
      setError(
        requestError.response?.data?.error ||
          "Nao foi possivel registrar a recusa. Tente novamente ou contate o suporte.",
      );
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
        O fluxo de aceite de termo e exclusivo para influenciadoras.
      </div>
    );
  }

  if (loading) {
    return <div className="loading-screen">Carregando termo...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">Termo de parceria</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          Leia com atencao e confirme seus dados para assinar
        </h1>
        {contract.version ? (
          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            Versao vigente: {contract.version}
          </p>
        ) : null}
      </header>

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
              : "border-sky-300/40 bg-sky-500/10 text-sky-100"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {!status.accepted ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
          <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/95 p-6 text-slate-900 shadow-inner">
            {contract.html ? (
              <div dangerouslySetInnerHTML={{ __html: contract.html }} />
            ) : (
              <p className="text-sm text-slate-600">
                Termo ainda nao disponivel. Recarregue a pagina em instantes.
              </p>
            )}
          </div>

          <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-white/80">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agree}
                onChange={(event) => setAgree(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950/60"
              />
              <span>
                Confirmo que li e concordo com o contrato acima. Os dados abaixo serao validados
                exatamente como cadastrados.
              </span>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.35em] text-white/50" htmlFor="cpf">
                  CPF
                </label>
                <input
                  id="cpf"
                  name="cpf"
                  value={cpf}
                  onChange={(event) => setCpf(formatCpf(event.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
                  disabled={submitting}
                />
              </div>

              <div>
                <label
                  className="text-xs uppercase tracking-[0.35em] text-white/50"
                  htmlFor="telefone"
                >
                  Telefone
                </label>
                <input
                  id="telefone"
                  name="telefone"
                  value={telefone}
                  onChange={(event) => setTelefone(formatPhone(event.target.value))}
                  inputMode="tel"
                  placeholder="(00) 00000-0000"
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
                  disabled={submitting}
                />
              </div>
            </div>

            {contract.hash ? (
              <p className="text-xs text-white/50">
                Hash de integridade (SHA-256): <span className="break-all">{contract.hash}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canSubmit || submitting}
              className="rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:from-emerald-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Processando..." : "Confirmar e assinar"}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              disabled={submitting}
              className="rounded-full border border-rose-300/40 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-100 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Recusar e sair
            </button>
          </div>
        </section>
      ) : null}

      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          if (!submitting) {
            setShowRejectModal(false);
          }
        }}
        title="Recusar termo de parceria"
        description="Voce sera desconectada e nao podera utilizar o painel enquanto nao aceitar o termo vigente."
        secondaryAction={{
          label: "Cancelar",
          onClick: () => setShowRejectModal(false),
        }}
        primaryAction={{
          label: "Confirmar recusa",
          onClick: handleReject,
          disabled: submitting,
          loading: submitting,
          loadingLabel: "Registrando...",
        }}
      />
    </div>
  );
}
