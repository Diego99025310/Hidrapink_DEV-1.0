import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import Table from "../components/Table.jsx";

const StatCard = ({ title, value, helper }) => (
  <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-6 shadow-lg">
    <p className="text-xs uppercase tracking-[0.35em] text-white/50">{title}</p>
    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    {helper ? <p className="mt-2 text-xs text-white/60">{helper}</p> : null}
  </div>
);

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [masterData, setMasterData] = useState(null);
  const [validations, setValidations] = useState(null);
  const [influencerData, setInfluencerData] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        if (user.role === "master") {
          const [dashboardRes, validationsRes] = await Promise.all([
            api.get("/api/master/dashboard"),
            api.get("/master/validations"),
          ]);
          setMasterData(dashboardRes.data);
          setValidations(validationsRes.data);
        } else {
          const [dashboardRes, historyRes] = await Promise.all([
            api.get("/api/influencer/dashboard"),
            api.get("/api/influencer/history"),
          ]);
          setInfluencerData(dashboardRes.data);
          setHistory(historyRes.data?.history ?? []);
        }
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.error ||
            "Nao foi possivel carregar o painel. Tente novamente em instantes.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user]);

  const cycleLabel = useMemo(() => {
    const cycle = user?.role === "master" ? masterData?.cycle : influencerData?.cycle;
    if (!cycle) return null;
    const month = String(cycle.cycle_month ?? cycle.cycleMonth).padStart(2, "0");
    return `${month}/${cycle.cycle_year ?? cycle.cycleYear}`;
  }, [masterData, influencerData, user?.role]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">
            Carregando painel
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

  if (user.role === "master" && masterData) {
    const stats = masterData.stats || {};
    const pendingValidations = validations?.pending || masterData.pendingValidations || [];
    const plans = masterData.plans || [];
    const influencers = masterData.influencers || [];

    return (
      <div className="space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.45em] text-pink-200">Dashboard Master</p>
          <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">
                Olá, {user.email?.split("@")[0] || "Master"}.
              </h1>
              <p className="mt-2 text-sm text-white/70">
                Acompanhe os agendamentos, validações pendentes e performance das
                influenciadoras neste ciclo.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.35em] text-white/50">
                Ciclo ativo
              </span>
              <p className="text-lg font-semibold text-white">{cycleLabel ?? "--/--"}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Influenciadoras ativas"
            value={stats.totalInfluencers ?? 0}
            helper="Com agenda neste ciclo mensal."
          />
          <StatCard
            title="Stories planejados"
            value={stats.plannedPosts ?? 0}
            helper={`${stats.validatedPosts ?? 0} já validados`}
          />
          <StatCard
            title="Validações pendentes"
            value={stats.pendingValidations ?? 0}
            helper={`${stats.alerts ?? 0} atrasos sinalizados`}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Validações pendentes</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Aprovar ou reenviar stories
              </p>
            </div>
            <Table
              columns={[
                {
                  label: "Data",
                  key: "scheduled_date",
                  render: (row) => (
                    <span className="font-medium text-white">{formatDate(row.scheduled_date)}</span>
                  ),
                },
                {
                  label: "Influenciadora",
                  key: "influencer_name",
                  render: (row) => (
                    <div>
                      <p className="font-medium text-white">{row.influencer_name}</p>
                      <p className="text-xs text-white/60">{row.instagram}</p>
                    </div>
                  ),
                },
                {
                  label: "Status",
                  key: "status",
                  render: (row) => (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                      {formatStatus(row.status)}
                    </span>
                  ),
                },
              ]}
              data={pendingValidations}
              emptyMessage="Nenhum story pendente."
            />
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Influenciadoras em destaque</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Planejado x validado no ciclo
              </p>
            </div>
            <Table
              columns={[
                {
                  label: "Influenciadora",
                  key: "nome",
                  render: (row) => (
                    <div>
                      <p className="font-medium text-white">{row.nome}</p>
                      <p className="text-xs text-white/60">{row.instagram}</p>
                    </div>
                  ),
                },
                {
                  label: "Planejados",
                  key: "planned",
                },
                {
                  label: "Validados",
                  key: "validated",
                },
              ]}
              data={influencers.slice(0, 6)}
              emptyMessage="Nenhum dado encontrado."
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Agenda do ciclo</h2>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Stories programados para todas as influenciadoras
            </p>
          </div>
          <Table
            columns={[
              {
                label: "Data",
                key: "scheduled_date",
                render: (row) => formatDate(row.scheduled_date),
              },
              {
                label: "Influenciadora",
                key: "influencer_name",
                render: (row) => (
                  <div>
                    <p className="font-medium text-white">{row.influencer_name}</p>
                    <p className="text-xs text-white/60">{row.instagram}</p>
                  </div>
                ),
              },
              {
                label: "Roteiro",
                key: "script_title",
                render: (row) => row.script_title ?? "Sem roteiro vinculado",
              },
              {
                label: "Status",
                key: "status",
                render: (row) => (
                  <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                    {formatStatus(row.status)}
                  </span>
                ),
              },
            ]}
            data={plans.slice(0, 12)}
            emptyMessage="Nenhum agendamento cadastrado para o ciclo."
          />
        </section>
      </div>
    );
  }

  if (user.role === "influencer" && influencerData) {
    const progress = influencerData.progress || {};
    const commission = influencerData.commission || {};
    const alerts = influencerData.alerts || [];
    const nextPlan = influencerData.nextPlan || null;

    const plans = influencerData.plans
      ? [...influencerData.plans].sort((a, b) =>
          new Date(a.scheduled_date) - new Date(b.scheduled_date),
        )
      : [];

    return (
      <div className="space-y-8">
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-pink-500/20 via-slate-900/40 to-slate-950/40 p-6 shadow-xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.45em] text-pink-200">
            Dashboard Influenciadora
          </p>
          <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">
                Olá, {influencerData.influencer?.nome || "criadora"}.
              </h1>
              <p className="mt-2 text-sm text-white/70">
                Mantenha seu calendário de stories em dia para potencializar sua comissão mensal.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.35em] text-white/50">
                Ciclo ativo
              </span>
              <p className="text-lg font-semibold text-white">{cycleLabel ?? "--/--"}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Dias planejados"
            value={progress.plannedDays ?? 0}
            helper={`${progress.pendingValidations ?? 0} aguardando validação`}
          />
          <StatCard
            title="Dias validados"
            value={progress.validatedDays ?? 0}
            helper={`Multiplicador atual: ${progress.multiplier ?? 0}x`}
          />
          <StatCard
            title="Comissão estimada"
            value={formatCurrency(commission.totalValue ?? 0)}
            helper={`Pontos previstos: ${commission.totalPoints ?? 0}`}
          />
        </section>

        {nextPlan ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Próximo story</p>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold text-white">
                  {formatDate(nextPlan.scheduled_date)}
                </p>
                <p className="text-sm text-white/70">
                  {nextPlan.script_title ?? "Sem roteiro vinculado. Escolha um roteiro no Planner."}
                </p>
              </div>
              <span className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80">
                {formatStatus(nextPlan.status)}
              </span>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Agenda do ciclo</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Stories planejados (clique no Planner para editar)
              </p>
            </div>
            <Table
              columns={[
                {
                  label: "Data",
                  key: "scheduled_date",
                  render: (row) => formatDate(row.scheduled_date),
                },
                {
                  label: "Roteiro",
                  key: "script_title",
                  render: (row) => row.script_title ?? "Sem roteiro vinculado",
                },
                {
                  label: "Status",
                  key: "status",
                  render: (row) => (
                    <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                      {formatStatus(row.status)}
                    </span>
                  ),
                },
              ]}
              data={plans}
              emptyMessage="Nenhum story programado. Acesse o Planner para montar sua agenda."
            />
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Alertas</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Dias em atraso ou aguardando validação
              </p>
            </div>
            <Table
              columns={[
                { label: "Data", key: "date", render: (row) => formatDate(row.date) },
                { label: "Status", key: "status", render: (row) => formatStatus(row.status) },
              ]}
              data={alerts}
              emptyMessage="Tudo certo! Nenhum alerta pendente."
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Sugestões de roteiros</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Conteúdos recentes para inspirar seu próximo story
              </p>
            </div>
            <div className="space-y-3">
              {influencerData.suggestions?.length ? (
                influencerData.suggestions.map((script) => (
                  <article
                    key={script.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"
                  >
                    <h3 className="text-base font-semibold text-white">{script.titulo}</h3>
                    <p className="mt-2 text-xs text-white/60">{script.descricao || "Sem descrição."}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                  Sem sugestões no momento. Utilize roteiros cadastrados pela equipe no Planner.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Histórico mensal</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Pontuação validada nos últimos ciclos
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner">
              <ul className="space-y-3 text-sm text-white/80">
                {history.length ? (
                  history.map((item) => (
                    <li
                      key={`${item.cycle_year}-${item.cycle_month}`}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3"
                    >
                      <span className="font-medium text-white">
                        {String(item.cycle_month).padStart(2, "0")}/{item.cycle_year}
                      </span>
                      <span className="text-white/60">
                        {formatCurrency(item.total_commission ?? 0)} •{" "}
                        {item.validated_days ?? 0} dias validados
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/60">
                    Nenhum histórico disponível.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return null;
}
