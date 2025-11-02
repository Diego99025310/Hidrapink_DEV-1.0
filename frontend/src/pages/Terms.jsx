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

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const ContractContent = ({ html }) => {
  if (!html) {
    return (
      <p className="text-sm text-slate-300">
        Termo ainda nao disponivel. Recarregue a pagina em instantes.
      </p>
    );
  }

  return (
    <div
      className="[&_h1]:text-pink-500 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:text-center [&_h1]:uppercase [&_h2]:text-pink-400 [&_h2]:mt-6 [&_h3]:text-pink-300 [&_h3]:mt-5 [&_p]:text-sm [&_p]:text-slate-200 [&_li]:text-sm [&_strong]:text-pink-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default function TermsAcceptancePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const apiBaseUrl = useMemo(() => {
    const base = api.defaults.baseURL || "";
    return base.endsWith("/") ? base.slice(0, -1) : base;
  }, []);

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState({ html: "", hash: "", version: "" });
  const [status, setStatus] = useState({
    accepted: false,
    waived: false,
    fetched: false,
    summary: null,
  });
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

  const canSubmit = useMemo(() => {
    if (!agree) return false;
    if (digitsLength(cpf) !== 11) return false;
    if (digitsLength(telefone) !== 11) return false;
    return true;
  }, [agree, cpf, telefone]);

  const resolveDownloadPath = useMemo(
    () => (path) => {
      if (!path) return null;
      if (path.startsWith("http://") || path.startsWith("https://")) {
        try {
          const parsed = new URL(path);
          return `${parsed.pathname}${parsed.search ?? ""}`;
        } catch (error) {
          return path;
        }
      }
      return path;
    },
    [],
  );

  const handleDownload = async (path, filename = "termo-assinado.html") => {
    if (!path) return;
    try {
      const resolved = resolveDownloadPath(path);
      const { data } = await api.get(resolved, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      setError(
        downloadError.response?.data?.error ||
          "Nao foi possivel baixar o comprovante. Tente novamente mais tarde.",
      );
    }
  };

  const fetchStatus = async () => {
    const { data } = await api.get("/api/aceite/status");
    setStatus({
      accepted: Boolean(data?.accepted),
      waived: Boolean(data?.waived),
      fetched: true,
      summary: data || null,
    });
    return data;
  };

  useEffect(() => {
    const init = async () => {
      if (!user || user.role !== "influencer") {
        setLoading(false);
        return;
      }

      try {
        const statusData = await fetchStatus();

        if (statusData?.accepted || statusData?.waived) {
          setMessage({
            type: "success",
            text: statusData?.waived
              ? "Dispensa registrada. Voce pode acessar o painel normalmente."
              : "Termo de parceria aceito. Voce pode utilizar o painel normalmente.",
          });
          setLoading(false);
          return;
        }

        const { data: contractData } = await api.get("/api/aceite/termo");
        setContract({
          html: contractData?.html ?? "",
          hash: contractData?.hash ?? "",
          version: contractData?.version ?? "",
        });
      } catch (requestError) {
        if (requestError.response?.status === 401) {
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

    init();
  }, [user]);

  const refreshStatusAndMessage = async () => {
    try {
      const summary = await fetchStatus();
      if (summary?.accepted || summary?.waived) {
        setMessage({
          type: "success",
          text: summary?.waived
            ? "Dispensa registrada. Voce pode acessar o painel normalmente."
            : "Termo de parceria aceito. Voce pode utilizar o painel normalmente.",
        });
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Nao foi possivel atualizar o status do termo. Recarregue a pagina.",
      );
    }
  };

  const handleConfirm = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      await api.post("/api/aceite/confirmar", {
        cpf,
        telefone,
      });
      await refreshStatusAndMessage();
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
      await api.post("/api/aceite/rejeitar");
      setShowRejectModal(false);
      setMessage({
        type: "info",
        text:
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

  const summary = status.summary;

  return (
    <div className="space-y-8 px-4 pb-16 pt-4 md:px-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-md">
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
          className={`rounded-2xl border px-4 py-3 text-sm backdrop-blur-md ${
            message.type === "success"
              ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
              : "border-sky-300/40 bg-sky-500/10 text-sky-100"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 backdrop-blur-md">
          {error}
        </div>
      ) : null}

      {status.accepted && summary?.downloadUrl ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              handleDownload(
                summary.downloadUrl,
                `termo-${summary.acceptanceId ?? "hidrapink"}.html`,
              )
            }
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
          >
            Baixar comprovante
          </button>
          {summary.hash ? (
            <span className="self-center text-xs text-white/60">
              Hash SHA-256: <span className="break-all text-white/80">{summary.hash}</span>
            </span>
          ) : null}
          {summary.createdAt ? (
            <span className="self-center text-xs text-white/60">
              Assinado em {formatDateTime(summary.createdAt)}
            </span>
          ) : null}
        </div>
      ) : null}

      {!status.accepted ? (
        <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              Leia o contrato e confirme seus dados antes de prosseguir.
            </p>
            <button
              type="button"
              onClick={() => setShowContractModal(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:border-white/40 hover:bg-white/10"
            >
              Visualizar em tela cheia
            </button>
          </div>

          <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/90 p-6 text-sm leading-relaxed text-slate-100 shadow-inner">
            <ContractContent html={contract.html} />
          </div>

          <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm text-white/80">
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

      <Modal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        title="Contrato de parceria"
        description="Visualizacao completa do termo vigente."
        primaryAction={{
          label: "Fechar",
          onClick: () => setShowContractModal(false),
        }}
      >
        <div className="max-h-[75vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-6 text-sm leading-relaxed text-slate-100 shadow-inner">
          <ContractContent html={contract.html} />
        </div>
      </Modal>
    </div>
  );
}
