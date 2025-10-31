import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import Table from "../components/Table.jsx";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
};

function SalesImportSection({
  disabled,
  onPreview,
  onClear,
  onConfirm,
  loadingPreview,
  loadingConfirm,
  analysis,
}) {
  const [text, setText] = useState("");

  const handlePreview = () => onPreview(text, setText);
  const handleConfirm = () => onConfirm(text, setText);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Importar vendas</h2>
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">
          Cole o CSV exportado do Shopify e valide antes de confirmar
        </p>
      </header>

      <textarea
        className="mt-6 h-40 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner transition focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
        placeholder="Cole aqui os dados CSV (pedidos, cupons, datas e pontos)..."
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={disabled}
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={disabled || !text.trim() || loadingPreview}
          className="rounded-full bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:from-pink-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingPreview ? "Analisando..." : "Analisar dados"}
        </button>

        <button
          type="button"
          onClick={() => onClear(setText)}
          disabled={disabled || (!text && !analysis)}
          className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Limpar
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={disabled || !analysis || loadingConfirm}
          className="rounded-full border border-emerald-300/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingConfirm ? "Confirmando..." : "Confirmar importação"}
        </button>
      </div>

      {analysis ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
            <p>
              {analysis.validCount} linha(s) prontas para importação • {analysis.errorCount} com
              ajustes necessários.
            </p>
            {analysis.summary ? (
              <p className="mt-2 text-xs text-white/60">
                Total de pontos válidos: <span className="font-semibold">{analysis.summary.total_points}</span> —{" "}
                {formatCurrency(analysis.summary.total_points_value)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SalesPageContent({
  userRole,
  influencers,
  influencersLoading,
  selectedInfluencer,
  onSelectInfluencer,
  summary,
  summaryLoading,
  sales,
  salesLoading,
  analysis,
  onPreviewImport,
  onClearImport,
  onConfirmImport,
  loadingPreview,
  loadingConfirm,
  message,
}) {
  const showImport = userRole === "master";

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">Gestão de vendas</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          Importação, resumo e performance das vendas
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

      {showImport ? (
        <SalesImportSection
          disabled={influencersLoading}
          onPreview={onPreviewImport}
          onClear={onClearImport}
          onConfirm={onConfirmImport}
          loadingPreview={loadingPreview}
          loadingConfirm={loadingConfirm}
          analysis={analysis}
        />
      ) : null}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Resumo de vendas</h2>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Pontuação acumulada e comissão estimada
            </p>
          </div>

          {showImport ? (
            <div className="flex items-center gap-3">
              <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="influencerSalesSelect">
                Influenciadora
              </label>
              <select
                id="influencerSalesSelect"
                value={selectedInfluencer}
                onChange={(event) => onSelectInfluencer(event.target.value)}
                disabled={influencersLoading}
                className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white shadow-inner transition focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40 md:w-60"
              >
                <option value="">Selecionar</option>
                {influencers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} — {item.instagram}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {summaryLoading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            Carregando resumo...
          </div>
        ) : summary ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">Cupom</p>
              <p className="mt-2 text-lg font-semibold text-white">{summary.cupom || "-"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">Pontos acumulados</p>
              <p className="mt-2 text-lg font-semibold text-white">{summary.total_points ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">Comissão estimada</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatCurrency(summary.total_points_value ?? 0)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            Nenhuma informação disponível. Realize uma importação para gerar o resumo.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Histórico de vendas importadas</h2>
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Pedidos cadastrados para o ciclo em andamento
          </p>
        </div>
        <Table
          columns={[
            {
              label: "Data",
              key: "date",
              render: (row) => formatDate(row.date),
            },
            {
              label: "Pedido",
              key: "order_number",
              render: (row) => (
                <div>
                  <p className="font-medium text-white">{row.orderNumber ?? row.order_number}</p>
                  <p className="text-xs text-white/60">{row.cupom || summary?.cupom || "-"}</p>
                </div>
              ),
            },
            {
              label: "Pontos",
              key: "points",
              render: (row) => (
                <div>
                  <p className="font-medium text-white">{row.points ?? 0}</p>
                  <p className="text-xs text-white/60">{formatCurrency(row.points_value ?? 0)}</p>
                </div>
              ),
            },
            {
              label: "Status",
              key: "status",
              render: (row) => (
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                  {(row.status || "pending").toUpperCase()}
                </span>
              ),
            },
          ]}
          data={sales}
          loading={salesLoading}
          emptyMessage="Nenhuma venda registrada para o filtro selecionado."
        />
      </section>

      {analysis?.rows?.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Pré-visualização da importação</h2>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Revise os dados e corrija linhas com erro antes de confirmar
            </p>
          </div>
          <Table
            columns={[
              { label: "Pedido", key: "orderNumber" },
              { label: "Cupom", key: "cupom" },
              { label: "Data", key: "date", render: (row) => row.date || row.rawDate || "-" },
              { label: "Pontos", key: "points" },
              {
                label: "Erros",
                key: "errors",
                render: (row) =>
                  row.errors?.length ? (
                    <ul className="space-y-1 text-xs text-rose-200">
                      {row.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-emerald-200">Nenhum</span>
                  ),
              },
            ]}
            data={analysis.rows}
            emptyMessage="Nenhuma linha analisada."
          />
        </section>
      ) : null}
    </div>
  );
}

export default function SalesPage() {
  const { user } = useAuth();
  const [influencers, setInfluencers] = useState([]);
  const [influencersLoading, setInfluencersLoading] = useState(true);
  const [selectedInfluencer, setSelectedInfluencer] = useState("");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchInfluencersForUser = async () => {
    setInfluencersLoading(true);
    try {
      const endpoint = user.role === "master" ? "/influenciadoras/consulta" : "/influenciadoras";
      const { data } = await api.get(endpoint);
      setInfluencers(data || []);
      if (data?.length === 1) {
        setSelectedInfluencer(String(data[0].id));
      }
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel carregar as influenciadoras para o resumo de vendas.",
      });
    } finally {
      setInfluencersLoading(false);
    }
  };

  const loadSummary = async (influencerId) => {
    if (!influencerId) {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    try {
      const { data } = await api.get(`/api/sales/summary/${influencerId}`);
      setSummary(data);
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel carregar o resumo de vendas. Tente novamente.",
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadSales = async (influencerId) => {
    if (!influencerId) {
      setSales([]);
      return;
    }
    setSalesLoading(true);
    try {
      const { data } = await api.get(`/api/sales/${influencerId}`);
      setSales(data || []);
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel carregar as vendas importadas.",
      });
    } finally {
      setSalesLoading(false);
    }
  };

  const handleSelectInfluencer = async (value) => {
    setSelectedInfluencer(value);
    if (value) {
      await Promise.all([loadSummary(value), loadSales(value)]);
    } else {
      setSummary(null);
      setSales([]);
    }
  };

  const handlePreviewImport = async (text, resetInput) => {
    if (!text.trim()) return;
    setLoadingPreview(true);
    setMessage(null);
    try {
      const { data } = await api.post("/api/sales/import/preview", { text });
      setAnalysis(data);
      setMessage({
        type: "success",
        text: "Análise concluída. Revise as linhas antes de confirmar.",
      });
    } catch (error) {
      console.error(error);
      setAnalysis(null);
      setMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel analisar os dados importados.",
      });
      resetInput("");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleClearImport = (resetInput) => {
    resetInput("");
    setAnalysis(null);
    setMessage(null);
  };

  const handleConfirmImport = async (text, resetInput) => {
    if (!analysis || !text.trim()) {
      setMessage({
        type: "error",
        text: "Realize a análise antes de confirmar a importação.",
      });
      return;
    }

    setLoadingConfirm(true);
    try {
      const { data } = await api.post("/api/sales/import/confirm", { text });
      setMessage({
        type: "success",
        text: `Importação concluída! ${data.inserted} linha(s) adicionadas.`,
      });
      setAnalysis(null);
      resetInput("");
      if (selectedInfluencer) {
        await Promise.all([loadSummary(selectedInfluencer), loadSales(selectedInfluencer)]);
      }
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          "Nao foi possivel confirmar a importação de vendas.",
      });
    } finally {
      setLoadingConfirm(false);
    }
  };

  useEffect(() => {
    fetchInfluencersForUser();
  }, [user.role]);

  useEffect(() => {
    if (selectedInfluencer) {
      loadSummary(selectedInfluencer);
      loadSales(selectedInfluencer);
    }
  }, [selectedInfluencer]);

  const canAccess = useMemo(() => {
    if (user.role === "master") return true;
    return Boolean(selectedInfluencer);
  }, [user.role, selectedInfluencer]);

  if (!canAccess && influencersLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">
            Carregando vendas
          </p>
        </div>
      </div>
    );
  }

  if (!canAccess && !influencers.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/70">
        Nenhum resumo de vendas disponível. Solicite ao master a liberação de acesso.
      </div>
    );
  }

  return (
    <SalesPageContent
      userRole={user.role}
      influencers={influencers}
      influencersLoading={influencersLoading}
      selectedInfluencer={selectedInfluencer}
      onSelectInfluencer={handleSelectInfluencer}
      summary={summary}
      summaryLoading={summaryLoading}
      sales={sales}
      salesLoading={salesLoading}
      analysis={analysis}
      onPreviewImport={handlePreviewImport}
      onClearImport={handleClearImport}
      onConfirmImport={handleConfirmImport}
      loadingPreview={loadingPreview}
      loadingConfirm={loadingConfirm}
      message={message}
    />
  );
}
