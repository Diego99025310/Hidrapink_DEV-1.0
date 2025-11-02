import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import Table from "../components/Table.jsx";

const StatCard = ({ title, value, helper }) => (
  <div className="rounded-3xl border border-brand-light bg-white/85 p-6 text-ink shadow-brand-soft">
    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">{title}</p>
    <p className="mt-3 font-display text-4xl text-ink">{value}</p>
    {helper ? <p className="mt-2 text-xs text-ink/70">{helper}</p> : null}
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
        <div className="flex flex-col items-center gap-3 text-brand">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-ink/60">Carregando painel</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-brand-medium/60 bg-brand-medium/15 p-8 text-center text-sm text-brand shadow-brand-soft">
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
      <div className="space-y-10 text-ink">
        <header className="rounded-[2.75rem] border border-brand-light bg-white/90 p-8 shadow-brand">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-brand">
                Dashboard Master
              </span>
              <h1 className="font-display text-4xl text-brand">
                Olá, {user.email?.split("@")[0] || "Master"}.
              </h1>
              <p className="max-w-xl text-sm text-ink/70">
                Acompanhe os agendamentos, validações pendentes e performance das influenciadoras neste ciclo.
              </p>
            </div>
            <div className="rounded-3xl border border-brand-light bg-brand-light/60 px-6 py-4 text-right text-ink">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Ciclo ativo</p>
              <p className="font-display text-2xl">{cycleLabel ?? "--/--"}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
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
              <h2 className="font-display text-xl text-brand">Validações pendentes</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/50">
                Aprovar ou reenviar stories
              </p>
            </div>
            <Table
              columns={[
                {
                  label: "Data",
                  key: "scheduled_date",
                  render: (row) => (
                    <span className="font-medium text-ink">{formatDate(row.scheduled_date)}</span>
                  ),
                },
                {
                  label: "Influenciadora",
                  key: "influencer_name",
                  render: (row) => (
                    <div className="space-y-1">
                      <p className="font-medium text-ink">{row.influencer_name}</p>
                      <p className="text-xs text-ink/60">{row.instagram}</p>
                    </div>
                  ),
                },
                {
                  label: "Status",
                  key: "status",
                  render: (row) => (
                    <span className="inline-flex rounded-full bg-brand-light/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
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
              <h2 className="font-display text-xl text-brand">Influenciadoras em destaque</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/50">
                Planejado x validado no ciclo
              </p>
            </div>
            <Table
              columns={[
                {
                  label: "Influenciadora",
                  key: "nome",
                  render: (row) => (
                    <div className="space-y-1">
                      <p className="font-medium text-ink">{row.nome}</p>
                      <p className="text-xs text-ink/60">{row.instagram}</p>
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
            <h2 className="font-display text-xl text-brand">Agenda do ciclo</h2>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/50">
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
                  <div className="space-y-1">
                    <p className="font-medium text-ink">{row.influencer_name}</p>
                    <p className="text-xs text-ink/60">{row.instagram}</p>
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
                  <span className="inline-flex rounded-full border border-brand-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
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
      <div className="space-y-10 text-ink">
        <header className="rounded-[2.75rem] border border-brand-light bg-white/90 p-8 shadow-brand">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-brand">
                Dashboard Influenciadora
              </span>
              <h1 className="font-display text-4xl text-brand">
                Olá, {influencerData.influencer?.nome || "criadora"}.
              </h1>
              <p className="max-w-xl text-sm text-ink/70">
                Mantenha seu calendário de stories em dia para potencializar sua comissão mensal.
              </p>
            </div>
            <div className="rounded-3xl border border-brand-light bg-brand-light/60 px-6 py-4 text-right text-ink">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Ciclo ativo</p>
              <p className="font-display text-2xl">{cycleLabel ?? "--/--"}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
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
          <section className="rounded-[2.25rem] border border-brand-light bg-white/85 p-6 text-ink shadow-brand-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">Próximo story</p>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="font-display text-2xl text-brand">
                  {formatDate(nextPlan.scheduled_date)}
                </p>
                <p className="text-sm text-ink/70">
                  {nextPlan.script_title ?? "Sem roteiro vinculado. Escolha um roteiro no Planner."}
                </p>
              </div>
              <span className="inline-flex rounded-full border border-brand-light px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand">
                {formatStatus(nextPlan.status)}
              </span>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl text-brand">Agenda do ciclo</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/50">
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
                    <span className="inline-flex rounded-full border border-brand-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
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
              <h2 className="font-display text-xl text-brand">Alertas</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/50">
                Dias em atraso ou aguardando validação
              </p>
            </div>
            <Table
              columns={[
                {
                  label: "Data",
                  key: "date",
                  render: (row) => <span className="font-medium text-ink">{formatDate(row.date)}</span>,
                },
                {
                  label: "Status",
                  key: "status",
                  render: (row) => (
                    <span className="font-semibold text-brand">{formatStatus(row.status)}</span>
                  ),
                },
              ]}
              data={alerts}
              emptyMessage="Tudo certo! Nenhum alerta pendente."
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl text-brand">Sugestões de roteiros</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/50">
                Conteúdos recentes para inspirar seu próximo story
              </p>
            </div>
            <div className="space-y-3">
              {influencerData.suggestions?.length ? (
                influencerData.suggestions.map((script) => (
                  <article
                    key={script.id}
                    className="rounded-2xl border border-brand-light bg-white/85 p-4 text-sm text-ink/80 shadow-brand-soft"
                  >
                    <h3 className="font-display text-lg text-brand">{script.titulo}</h3>
                    <p className="mt-2 text-xs text-ink/60">{script.descricao || "Sem descrição."}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-brand-light bg-white/85 p-4 text-sm text-ink/60 shadow-brand-soft">
                  Sem sugestões no momento. Utilize roteiros cadastrados pela equipe no Planner.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl text-brand">Histórico mensal</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/50">
                Pontuação validada nos últimos ciclos
              </p>
            </div>
            <div className="rounded-3xl border border-brand-light bg-white/85 p-5 shadow-brand-soft">
              <ul className="space-y-3 text-sm text-ink/80">
                {history.length ? (
                  history.map((item) => (
                    <li
                      key={`${item.cycle_year}-${item.cycle_month}`}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-brand-light/50 px-4 py-3"
                    >
                      <span className="font-display text-lg text-brand">
                        {String(item.cycle_month).padStart(2, "0")}/{item.cycle_year}
                      </span>
                      <span className="text-ink/60">
                        {formatCurrency(item.total_commission ?? 0)} •{" "}
                        {item.validated_days ?? 0} dias validados
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl bg-brand-light/40 px-4 py-3 text-sm text-ink/60">
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
