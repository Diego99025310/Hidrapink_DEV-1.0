import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import InfluencerForm from "../components/InfluencerForm.jsx";
import InfluencerTable from "../components/InfluencerTable.jsx";
import Modal from "../components/Modal.jsx";

const endpointConfigs = {
  api: {
    list: "/api/influencers",
    create: "/api/influencers",
    update: (id) => `/api/influencers/${id}`,
    delete: (id) => `/api/influencers/${id}`,
    reset: (id) => `/api/influencers/${id}/reset-password`,
  },
  legacy: {
    list: "/influenciadoras",
    create: "/influenciadora",
    update: (id) => `/influenciadora/${id}`,
    delete: (id) => `/influenciadora/${id}`,
    reset: (id) => `/influenciadora/${id}/reset-password`,
  },
};

const normalizeInfluencer = (item = {}) => ({
  id: item.id,
  nome: item.name ?? item.nome ?? "",
  instagram: item.instagram ?? "",
  email: item.email ?? "",
  telefone: item.contact ?? item.contato ?? "",
  cpf: item.cpf ?? "",
  cupom: item.coupon ?? item.cupom ?? "",
  cep: item.cep ?? "",
  numero: item.numero ?? "",
  complemento: item.complemento ?? "",
  logradouro: item.logradouro ?? "",
  bairro: item.bairro ?? "",
  cidade: item.cidade ?? "",
  estado: item.estado ?? "",
  createdAt: item.createdAt ?? item.created_at ?? "",
  status: item.status ?? item.accountStatus ?? null,
  contractSignatureWaived:
    item.contractSignatureWaived ?? item.contract_signature_waived ?? false,
  contractSignatureCodeHash:
    item.contractSignatureCodeHash ?? item.contract_signature_code_hash ?? null,
  acceptancestatus: "desconhecido",
  aceiteResumo: null,
});

export default function InfluencersPage() {
  const { user } = useAuth();
  const [endpointKey, setEndpointKey] = useState("api");
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const formId = editing ? "influencer-edit-form" : "influencer-create-form";

  const endpoints = useMemo(() => endpointConfigs[endpointKey], [endpointKey]);
  const apiBaseUrl = useMemo(() => {
    const base = api.defaults.baseURL || "";
    return base.endsWith("/") ? base.slice(0, -1) : base;
  }, []);

  const resolveAcceptancestatuses = useMemo(() => {
    const mapStatus = (summary) => {
      if (!summary) return "desconhecido";
      if (summary.waived) return "dispensado";
      if (!summary.acceptanceId) return "pendente";
      const normalized = (summary.status || "").toLowerCase();
      if (normalized === "aceito" || normalized === "accepted") return "aceito";
      if (normalized === "recusado" || normalized === "rejeitado") return "recusado";
      return "desconhecido";
    };

    return async (list) => {
      if (!list.length) {
        setAnalysisLoading(false);
        return list;
      }
      setAnalysisLoading(true);
      const updated = await Promise.all(
        list.map(async (item) => {
          if (item.contractSignatureWaived) {
            const summary = {
              waived: true,
              status: "dispensado",
              acceptanceId: null,
              downloadUrl: null,
              createdAt: null,
            };
            return { ...item, acceptancestatus: "dispensado", aceiteResumo: summary };
          }
          try {
            const { data } = await api.get(`/api/aceite/influenciadora/${item.id}/resumo`);
            return {
              ...item,
              acceptancestatus: mapStatus(data),
              aceiteResumo: data,
            };
          } catch (error) {
            if (error.response?.status === 404) {
              return {
                ...item,
                acceptancestatus: "pendente",
                aceiteResumo: null,
              };
            }
            console.error(error);
            return {
              ...item,
              acceptancestatus: "desconhecido",
              aceiteResumo: null,
            };
          }
        }),
      );
      setAnalysisLoading(false);
      return updated;
    };
  }, []);

  useEffect(() => {
    if (user?.role !== "master") {
      setLoading(false);
      return;
    }

    const fetchInfluencers = async () => {
      setLoading(true);
      setAlert(null);
      try {
        const { data } = await api.get(endpoints.list);
        const list = Array.isArray(data) ? data.map(normalizeInfluencer) : [];
        const enriched = await resolveAcceptancestatuses(list);
        setInfluencers(enriched);
      } catch (error) {
        if (error.response?.status === 404 && endpointKey === "api") {
          setEndpointKey("legacy");
          return;
        }
        console.error(error);
        setInfluencers([]);
        setAlert({
          type: "error",
          text:
            error.response?.data?.error ||
            "Nao foi possivel carregar as influenciadoras. Tente novamente.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInfluencers();
  }, [user?.role, endpointKey, endpoints.list, resolveAcceptancestatuses]);

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const openCreateModal = () => {
    setEditing(null);
    setCredentials(null);
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditing(record);
    setCredentials(null);
    setModalOpen(true);
  };

  const buildPayload = (values, isEdit) => {
    const payload = {
      nome: values.nome?.trim(),
      instagram: values.instagram?.trim(),
      email: values.email?.trim(),
      contato: values.telefone?.trim(),
      cpf: values.cpf?.trim(),
      cupom: values.cupom?.trim(),
      cep: values.cep?.trim(),
      numero: values.numero?.trim(),
      complemento: values.complemento?.trim() || "",
      logradouro: values.logradouro?.trim(),
      bairro: values.bairro?.trim(),
      cidade: values.cidade?.trim(),
      estado: values.estado?.trim()?.toUpperCase(),
      dispensaAssinatura: Boolean(values.dispensaAssinatura),
      contractSignatureWaived: Boolean(values.dispensaAssinatura),
    };

    if (!isEdit) {
      payload.loginEmail = values.email?.trim();
    }

    if (values.senha?.trim()) {
      payload.password = values.senha.trim();
    }

    if (payload.cupom) {
      payload.cupom = payload.cupom.toUpperCase();
    }

    return payload;
  };

  const refreshList = async () => {
    try {
      const { data } = await api.get(endpoints.list);
      const normalized = Array.isArray(data) ? data.map(normalizeInfluencer) : [];
      const enriched = await resolveAcceptancestatuses(normalized);
      setInfluencers(enriched);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (values) => {
    setFormLoading(true);
    setAlert(null);
    if (!editing) {
      setCredentials(null);
    }
    const payload = buildPayload(values, Boolean(editing));

    try {
      if (editing) {
        await api.put(endpoints.update(editing.id), payload);
        setAlert({ type: "success", text: "Influenciadora atualizada com sucesso." });
        setCredentials(null);
      } else {
        const { data } = await api.post(endpoints.create, payload);
        const passwordInfo =
          data?.senha_provisoria ??
          data?.provisionalPassword ??
          values.senha?.trim() ??
          "";
        const loginIdentifier =
          data?.loginEmail ?? payload.loginEmail ?? values.email?.trim() ?? "";
        const signatureCode = data?.signatureCode ?? data?.codigoAssinatura ?? null;
        const baseOrigin =
          typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
        const normalizedOrigin = baseOrigin.endsWith("/")
          ? baseOrigin.slice(0, -1)
          : baseOrigin;
        setAlert({
          type: "success",
          text: "Influenciadora cadastrada com sucesso.",
        });
        setCredentials({
          name: values.nome?.trim() ?? "",
          email: loginIdentifier,
          provisionalPassword: passwordInfo || null,
          signatureCode,
          waived: Boolean(values.dispensaAssinatura),
          loginUrl: `${normalizedOrigin}/login`,
          contractUrl: `${normalizedOrigin}/aceite-termos`,
        });
      }
      closeModal();
      await refreshList();
    } catch (error) {
      if (error.response?.status === 404 && endpointKey === "api") {
        setEndpointKey("legacy");
        setFormLoading(false);
        return;
      }
      console.error(error);
      setAlert({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel salvar a influenciadora. Verifique os campos e tente novamente.",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Remover ${record.nome || "influenciadora"}? esta acao e irreversivel.`)) {
      return;
    }
    setAlert(null);
    try {
      await api.delete(endpoints.delete(record.id));
      setAlert({ type: "success", text: "Influenciadora removida com sucesso." });
      await refreshList();
    } catch (error) {
      if (error.response?.status === 404 && endpointKey === "api") {
        setEndpointKey("legacy");
        return;
      }
      console.error(error);
      setAlert({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel remover a influenciadora. Tente novamente.",
      });
    }
  };
  const handleResetPassword = async (record) => {
    if (
      !window.confirm(
        `Gerar nova senha provisoria para ${record.nome || "influenciadora"}? A senha atual sera substituida.`,
      )
    ) {
      return;
    }

    setAlert(null);
    try {
      const { data } = await api.post(endpoints.reset(record.id));
      const passwordInfo = data?.senha_provisoria ?? data?.provisionalPassword ?? null;

      setAlert({
        type: "success",
        text: passwordInfo
          ? `Senha redefinida com sucesso: ${passwordInfo}`
          : "Senha redefinida com sucesso.",
      });

    } catch (error) {
      if (error.response?.status === 404 && endpointKey === "api") {
        setEndpointKey("legacy");
        return;
      }
      console.error(error);
      setAlert({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel redefinir a senha. Verifique se o endpoint esta disponivel no backend.",
      });
    }
  };

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

  const handleDownloadAcceptance = async (record) => {
    const path = record.aceiteResumo?.downloadUrl;
    if (!path) return;
    try {
      const resolved = resolveDownloadPath(path);
      const { data } = await api.get(resolved, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      const slug =
        record.instagram?.replace(/[^a-zA-Z0-9_-]/g, "") || record.nome?.replace(/\s+/g, "-") || "termo";
      link.href = blobUrl;
      link.download = `termo-${slug}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      setAlert({
        type: "error",
        text:
          downloadError.response?.data?.error ||
          "Nao foi possivel baixar o termo assinado. Tente novamente mais tarde.",
      });
    }
  };

  if (user?.role !== "master") {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/70">
        Este modulo esta disponivel apenas para administradores master.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Gestao de influenciadoras
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white">
              Cadastro, credenciais e status de aceite
            </h1>
            <p className="text-sm text-white/60">
              Cadastre novas criadoras, atualize dados e acompanhe o status do termo de parceria.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:from-pink-400 hover:to-pink-400"
          >
            Adicionar influenciadora
          </button>
        </div>
      </header>

      {alert ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            alert.type === "success"
              ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
              : "border-rose-300/40 bg-rose-500/10 text-rose-100"
          }`}
        >
          {alert.text}
        </div>
      ) : null}

      {credentials ? (
        <section className="space-y-4 rounded-3xl border border-emerald-300/40 bg-emerald-500/10 p-6 text-sm text-emerald-100">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">
                Credenciais geradas
              </p>
              <h2 className="text-xl font-semibold text-white">
                Compartilhe com {credentials.name || "a influenciadora"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCredentials(null)}
              className="inline-flex items-center rounded-full border border-emerald-200/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-50 transition hover:border-emerald-200/50 hover:bg-emerald-500/20"
            >
              Ocultar
            </button>
          </div>

          <dl className="grid gap-3 text-sm text-emerald-50">
            <div className="grid gap-1 md:grid-cols-[160px_1fr] md:items-center">
              <dt className="text-xs uppercase tracking-[0.25em] text-emerald-200">Login</dt>
              <dd className="font-semibold text-white">{credentials.email}</dd>
            </div>
            <div className="grid gap-1 md:grid-cols-[160px_1fr] md:items-center">
              <dt className="text-xs uppercase tracking-[0.25em] text-emerald-200">
                Senha provisoria
              </dt>
              <dd className="font-semibold text-white">
                {credentials.provisionalPassword
                  ? credentials.provisionalPassword
                  : "Gerada automaticamente pelo sistema."}
              </dd>
            </div>
            {credentials.signatureCode && !credentials.waived ? (
              <div className="grid gap-1 md:grid-cols-[160px_1fr] md:items-center">
                <dt className="text-xs uppercase tracking-[0.25em] text-emerald-200">
                  Codigo de assinatura
                </dt>
                <dd className="font-semibold text-white">{credentials.signatureCode}</dd>
              </div>
            ) : null}
            {credentials.waived ? (
              <div className="grid gap-1 md:grid-cols-[160px_1fr] md:items-center">
                <dt className="text-xs uppercase tracking-[0.25em] text-emerald-200">
                  Assinatura
                </dt>
                <dd className="text-emerald-100">
                  Dispensa registrada. A influenciadora acessara o painel sem assinar o termo.
                </dd>
              </div>
            ) : null}
            <div className="grid gap-1 md:grid-cols-[160px_1fr] md:items-center">
              <dt className="text-xs uppercase tracking-[0.25em] text-emerald-200">
                Acesso ao painel
              </dt>
              <dd>
                <a
                  href={credentials.loginUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-white underline decoration-emerald-200/60 underline-offset-4 transition hover:decoration-emerald-100"
                >
                  {credentials.loginUrl}
                </a>
              </dd>
            </div>
            <div className="grid gap-1 md:grid-cols-[160px_1fr] md:items-center">
              <dt className="text-xs uppercase tracking-[0.25em] text-emerald-200">Contrato</dt>
              <dd>
                <a
                  href={credentials.contractUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-white underline decoration-emerald-200/60 underline-offset-4 transition hover:decoration-emerald-100"
                >
                  {credentials.contractUrl}
                </a>
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {analysisLoading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
          Atualizando status de aceite...
        </div>
      )}

      <InfluencerTable
        data={influencers}
        loading={loading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onResetPassword={handleResetPassword}
        onDownloadAcceptance={handleDownloadAcceptance}
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? "Editar influenciadora" : "Cadastrar influenciadora"}
        description={
          editing
            ? "Atualize os dados cadastrais, endereco e status de assinatura. Caso informe nova senha, ela substituira a atual imediatamente."
            : "Preencha informacoes basicas, endereco e preferencia de assinatura. Se deixar a senha em branco, o sistema gera uma senha padrao automaticamente."
        }
        secondaryAction={{ label: "Cancelar", onClick: closeModal }}
        primaryAction={{
          label: editing ? "Salvar alteracoes" : "Cadastrar",
          loading: formLoading,
          loadingLabel: "Salvando...",
          disabled: formLoading,
          form: formId,
          type: "submit",
        }}
      >
        <InfluencerForm
          formId={formId}
          initialData={editing}
          onSubmit={handleSubmit}
          loading={formLoading}
          mode={editing ? "edit" : "create"}
        />
      </Modal>
    </div>
  );
}
