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
  createdAt: item.createdAt ?? item.created_at ?? "",
  status: item.status ?? item.accountStatus ?? null,
  contractSignatureWaived:
    item.contractSignatureWaived ?? item.contract_signature_waived ?? false,
  contractSignatureCodeHash:
    item.contractSignatureCodeHash ?? item.contract_signature_code_hash ?? null,
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

  const endpoints = useMemo(() => endpointConfigs[endpointKey], [endpointKey]);

  const resolveAcceptancestatuses = useMemo(
    () => async (list) => {
      if (!list.length) { setAnalysisLoading(false); return list; }
      setAnalysisLoading(true);
      const updated = await Promise.all(
        list.map(async (item) => {
          if (item.contractSignatureWaived) {
            return { ...item, acceptancestatus: "dispensado" };
          }
          try {
            await api.get(`/api/contrato-assinado/influenciadora/${item.id}`);
            return { ...item, acceptancestatus: "completo" };
          } catch (error) {
            if (error.response?.status === 404) {
              return { ...item, acceptancestatus: "pendente" };
            }
            return { ...item, acceptancestatus: "desconhecido" };
          }
        }),
      );
      setAnalysisLoading(false);
      return updated;
    },
    [],
  );

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
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditing(record);
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
    };

    if (!isEdit) {
      payload.loginEmail = values.email?.trim();
    }

    if (values.senha?.trim()) {
      payload.password = values.senha.trim();
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
    const payload = buildPayload(values, Boolean(editing));

    try {
      if (editing) {
        await api.put(endpoints.update(editing.id), payload);
        setAlert({ type: "success", text: "Influenciadora atualizada com sucesso." });
      } else {
        const { data } = await api.post(endpoints.create, payload);
        const passwordInfo =
          data?.senha_provisoria ?? data?.provisionalPassword ?? values.senha?.trim() ?? "";
        setAlert({
          type: "success",
          text: passwordInfo
            ? `Influenciadora cadastrada com sucesso. Senha provisoria: ${passwordInfo}`
            : "Influenciadora cadastrada com sucesso.",
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
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? "Editar influenciadora" : "Cadastrar influenciadora"}
        description={
          editing
            ? "Atualize os dados cadastrais. Caso informe uma nova senha, ela substituiraa atual imediatamente."
            : "Preencha os dados da nova influenciadora. Uma senha provisoria pode ser informada ou gerada automaticamente."
        }
        secondaryAction={{ label: "Cancelar", onClick: closeModal }}
        showActions={false}
      >
        <InfluencerForm
          initialData={editing}
          onSubmit={handleSubmit}
          loading={formLoading}
          mode={editing ? "edit" : "create"}
        />
      </Modal>
    </div>
  );
}
