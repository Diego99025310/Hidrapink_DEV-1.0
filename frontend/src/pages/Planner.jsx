import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";

const toInputDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const formatDisplayDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
};

const formatStatus = (status) => {
  switch (status) {
    case "validated":
      return "Validado";
    case "scheduled":
      return "Programado";
    case "posted":
      return "Publicado";
    case "missed":
      return "Pendente";
    default:
      return status || "-";
  }
};

const ScriptSelect = ({ scripts, value, onChange, id = "scriptId" }) => (
  <select
    id={id}
    name="scriptId"
    value={value}
    onChange={onChange}
    className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner transition focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
  >
    <option value="">Selecionar roteiro (opcional)</option>
    {scripts.map((script) => (
      <option key={script.id} value={script.id}>
        {script.titulo}
      </option>
    ))}
  </select>
);

function InfluencerPlanner({ data, scripts, onRefresh }) {
  const [form, setForm] = useState({ date: "", scriptId: "", notes: "" });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [removing, setRemoving] = useState(null);

  const cycleLabel = useMemo(() => {
    if (!data?.cycle) return null;
    const month = String(data.cycle.cycle_month ?? data.cycle.cycleMonth).padStart(2, "0");
    return `${month}/${data.cycle.cycle_year ?? data.cycle.cycleYear}`;
  }, [data?.cycle]);

  const onFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitNewPlan = async (event) => {
    event.preventDefault();
    if (!form.date) {
      setMessage({ type: "error", text: "Informe a data do agendamento." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await api.post("/api/influencer/plan", {
        entries: [
          {
            date: form.date,
            scriptId: form.scriptId ? Number(form.scriptId) : null,
            notes: form.notes || null,
          },
        ],
      });
      setMessage({ type: "success", text: "Story agendado com sucesso!" });
      setForm({ date: "", scriptId: "", notes: "" });
      await onRefresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          error.message ||
          "Nao foi possivel registrar o agendamento.",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (plan) => {
    setEditingPlan({
      ...plan,
      date: toInputDate(plan.scheduled_date),
      scriptId: plan.content_script_id ?? plan.contentScriptId ?? "",
      notes: plan.notes ?? "",
    });
  };

  const updatePlan = async () => {
    if (!editingPlan) return;
    setSaving(true);
    try {
      const payload = {
        date: editingPlan.date,
        notes: editingPlan.notes ?? "",
      };
      if (editingPlan.scriptId === "") {
        payload.scriptId = null;
      } else if (editingPlan.scriptId != null) {
        payload.scriptId = Number(editingPlan.scriptId);
      }

      await api.put(`/api/influencer/plan/${editingPlan.id}`, payload);
      setMessage({ type: "success", text: "Agendamento atualizado." });
      setEditingPlan(null);
      await onRefresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          error.message ||
          "Nao foi possivel atualizar o agendamento.",
      });
    } finally {
      setSaving(false);
    }
  };

  const removePlan = async (planId) => {
    setRemoving(planId);
    try {
      await api.post("/api/influencer/plan", { removedPlanIds: [planId] });
      setMessage({ type: "success", text: "Agendamento removido." });
      await onRefresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          error.message ||
          "Nao foi possivel remover o agendamento.",
      });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">
          Planner de stories
        </p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Agenda do ciclo {cycleLabel ?? "--/--"}
            </h1>
            <p className="text-sm text-white/70">
              Programe os stories do mês e acompanhe o status de validação.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/60">
            {data?.influencer?.instagram || data?.influencer?.nome || "Influenciadora"}
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <header>
          <h2 className="text-lg font-semibold text-white">Adicionar agendamento</h2>
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Escolha a data, selecione um roteiro e adicione observações
          </p>
        </header>

        {message ? (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
                : "border-rose-300/40 bg-rose-500/10 text-rose-100"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={submitNewPlan}>
          <div>
            <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="date">
              Data
            </label>
            <input
              id="date"
              name="date"
              type="date"
              min={toInputDate(new Date())}
              value={form.date}
              onChange={onFieldChange}
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner transition focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="scriptId">
              Roteiro
            </label>
            <div className="mt-2">
              <ScriptSelect scripts={scripts} value={form.scriptId} onChange={onFieldChange} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="notes">
              Observações (opcional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={form.notes}
              onChange={onFieldChange}
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner transition focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
              placeholder="Adicione briefing, hashtags ou pontos de atenção."
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:from-pink-400 hover:to-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300/60 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Adicionar ao planner"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Agenda do ciclo</h2>
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Visualize seus stories e acompanhe o status em tempo real
          </p>
        </div>
        <Table
          columns={[
            {
              label: "Data",
              key: "scheduled_date",
              render: (plan) => (
                <div>
                  <p className="font-medium text-white">{formatDisplayDate(plan.scheduled_date)}</p>
                  <p className="text-xs text-white/60">#{plan.id}</p>
                </div>
              ),
            },
            {
              label: "Roteiro",
              key: "script_title",
              render: (plan) => (
                <div>
                  <p className="font-medium text-white">
                    {plan.script_title ?? "Sem roteiro vinculado"}
                  </p>
                  <p className="text-xs text-white/60">{plan.notes || "Sem observações."}</p>
                </div>
              ),
            },
            {
              label: "Status",
              key: "status",
              render: (plan) => (
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                  {formatStatus(plan.status)}
                </span>
              ),
            },
            {
              label: "Ações",
              key: "actions",
              render: (plan) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:border-pink-300 hover:text-pink-200"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => removePlan(plan.id)}
                    disabled={removing === plan.id}
                    className="rounded-full border border-rose-300/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removing === plan.id ? "Removendo..." : "Remover"}
                  </button>
                </div>
              ),
            },
          ]}
          data={data?.plans ?? []}
          emptyMessage="Nenhum agendamento cadastrado. Utilize o formulário acima para adicionar stories."
        />
      </section>

      <Modal
        isOpen={Boolean(editingPlan)}
        title="Editar agendamento"
        description="Atualize a data, roteiro ou observações deste story."
        onClose={() => setEditingPlan(null)}
        primaryAction={{
          label: saving ? "Salvando..." : "Salvar alterações",
          onClick: updatePlan,
        }}
        secondaryAction={{
          label: "Cancelar",
          onClick: () => setEditingPlan(null),
        }}
      >
        {editingPlan ? (
          <div className="space-y-4 text-sm text-white/80">
            <div>
              <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="edit-date">
                Data
              </label>
              <input
                id="edit-date"
                type="date"
                value={editingPlan.date}
                onChange={(event) =>
                  setEditingPlan((prev) => ({ ...prev, date: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="edit-script">
                Roteiro
              </label>
              <div className="mt-2">
                <ScriptSelect
                  id="edit-script"
                  scripts={scripts}
                  value={editingPlan.scriptId ?? ""}
                  onChange={(event) =>
                    setEditingPlan((prev) => ({ ...prev, scriptId: event.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="edit-notes">
                Observações
              </label>
              <textarea
                id="edit-notes"
                rows={3}
                value={editingPlan.notes ?? ""}
                onChange={(event) =>
                  setEditingPlan((prev) => ({ ...prev, notes: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function MasterPlanner() {
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [influencers, setInfluencers] = useState([]);
  const [influencersLoading, setInfluencersLoading] = useState(true);
  const [selectedInfluencer, setSelectedInfluencer] = useState("");
  const [plannerData, setPlannerData] = useState(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const loadPending = async () => {
    setPendingLoading(true);
    try {
      const { data } = await api.get("/master/validations");
      setPending(data?.pending ?? []);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel carregar as validações pendentes.",
      });
    } finally {
      setPendingLoading(false);
    }
  };

  const loadInfluencers = async () => {
    setInfluencersLoading(true);
    try {
      const { data } = await api.get("/influenciadoras/consulta");
      setInfluencers(data || []);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel carregar a lista de influenciadoras.",
      });
    } finally {
      setInfluencersLoading(false);
    }
  };

  const loadPlanner = async (influencerId) => {
    if (!influencerId) {
      setPlannerData(null);
      setPlannerScripts([]);
      return;
    }
    setPlannerLoading(true);
    try {
      const { data } = await api.get("/api/influencer/plan", {
        params: { influencerId },
      });
      setPlannerData(data);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel carregar o planner da influenciadora selecionada.",
      });
    } finally {
      setPlannerLoading(false);
    }
  };

  const handleSelect = async (event) => {
    const value = event.target.value;
    setSelectedInfluencer(value);
    await loadPlanner(value);
  };

  const handleValidationAction = async (planId, action) => {
    setActionLoading((prev) => ({ ...prev, [planId]: action }));
    try {
      await api.post(`/master/validations/${planId}/${action}`);
      setFeedback({
        type: "success",
        text: action === "approve" ? "Story validado com sucesso." : "Story reaberto para ajustes.",
      });
      await loadPending();
      if (selectedInfluencer) {
        await loadPlanner(selectedInfluencer);
      }
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel atualizar o status do story. Tente novamente.",
      });
    } finally {
      setActionLoading((prev) => {
        const nextState = { ...prev };
        delete nextState[planId];
        return nextState;
      });
    }
  };

  useEffect(() => {
    loadPending();
    loadInfluencers();
  }, []);

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">
          Controle de planejamentos
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          Aprove, acompanhe e ajuste os stories do ciclo
        </h1>
      </header>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
              : "border-rose-300/40 bg-rose-500/10 text-rose-100"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Validações pendentes</h2>
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Aprove ou reabra stories conforme a entrega
          </p>
        </div>
        <Table
          columns={[
            {
              label: "Data",
              key: "scheduled_date",
              render: (plan) => formatDisplayDate(plan.scheduled_date),
            },
            {
              label: "Influenciadora",
              key: "influencer_name",
              render: (plan) => (
                <div>
                  <p className="font-medium text-white">{plan.influencer_name}</p>
                  <p className="text-xs text-white/60">{plan.instagram}</p>
                </div>
              ),
            },
            {
              label: "Roteiro",
              key: "script_title",
              render: (plan) =>
                plan.script_title ? (
                  <span className="text-sm text-white">{plan.script_title}</span>
                ) : (
                  <span className="text-xs text-white/60">Sem roteiro vinculado</span>
                ),
            },
            {
              label: "Ações",
              key: "actions",
              render: (plan) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleValidationAction(plan.id, "approve")}
                    disabled={actionLoading[plan.id] === "approve"}
                    className="rounded-full border border-emerald-300/40 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading[plan.id] === "approve" ? "Aprovando..." : "Aprovar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleValidationAction(plan.id, "reject")}
                    disabled={actionLoading[plan.id] === "reject"}
                    className="rounded-full border border-rose-300/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading[plan.id] === "reject" ? "Reabrindo..." : "Reabrir"}
                  </button>
                </div>
              ),
            },
          ]}
          data={pending}
          loading={pendingLoading}
          emptyMessage="Sem validações pendentes no momento."
        />
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,_240px)_1fr] md:items-end">
          <div>
            <h2 className="text-lg font-semibold text-white">Planner por influenciadora</h2>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Consulte o cronograma de cada influenciadora
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="plannerSelect">
              Selecionar
            </label>
            <select
              id="plannerSelect"
              value={selectedInfluencer}
              onChange={handleSelect}
              disabled={influencersLoading}
              className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white shadow-inner transition focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40 md:w-60"
            >
              <option value="">Escolha uma influenciadora</option>
              {influencers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome} — {item.instagram}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedInfluencer ? (
          plannerLoading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              Carregando planner da influenciadora selecionada...
            </div>
          ) : (
            <Table
              columns={[
                {
                  label: "Data",
                  key: "scheduled_date",
                  render: (plan) => formatDisplayDate(plan.scheduled_date),
                },
                {
                  label: "Roteiro",
                  key: "script_title",
                  render: (plan) =>
                    plan.script_title ? (
                      <span className="text-sm text-white">{plan.script_title}</span>
                    ) : (
                      <span className="text-xs text-white/60">Sem roteiro vinculado</span>
                    ),
                },
                {
                  label: "Notas",
                  key: "notes",
                  render: (plan) => (
                    <span className="text-xs text-white/60">{plan.notes || "Sem observações."}</span>
                  ),
                },
                {
                  label: "Status",
                  key: "status",
                  render: (plan) => (
                    <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                      {formatStatus(plan.status)}
                    </span>
                  ),
                },
              ]}
              data={plannerData?.plans ?? []}
              emptyMessage="Nenhum story programado para esta influenciadora."
            />
          )
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Selecione uma influenciadora para visualizar o planner do ciclo.
          </div>
        )}
      </section>
    </div>
  );
}

export default function PlannerPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(user?.role === "influencer");
  const [error, setError] = useState(null);

  const loadInfluencerPlanner = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: response } = await api.get("/api/influencer/plan");
      setData(response);
      setScripts(response?.scripts ?? []);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          "Nao foi possivel carregar seu planner. Tente novamente em instantes.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "influencer") {
      loadInfluencerPlanner();
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">
            Carregando planner
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-400/40 bg-rose-500/10 p-8 text-center text-sm text-rose-100 shadow-lg">
        {error}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role === "influencer") {
    return <InfluencerPlanner data={data} scripts={scripts} onRefresh={loadInfluencerPlanner} />;
  }

  return <MasterPlanner />;
}
