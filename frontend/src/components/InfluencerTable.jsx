const statusStyles = {
  ativa: "border-emerald-300/40 bg-emerald-500/10 text-emerald-100",
  bloqueada: "border-rose-300/40 bg-rose-500/10 text-rose-100",
  pendente: "border-amber-300/40 bg-amber-500/10 text-amber-100",
  completo: "border-emerald-300/40 bg-emerald-500/10 text-emerald-100",
  dispensado: "border-sky-300/40 bg-sky-500/10 text-sky-100",
  desconhecido: "border-white/20 bg-white/5 text-white/70",
};

const formatPhone = (value) => {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value || "-";
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const resolveAccountStatus = (influencer) => {
  const raw =
    (influencer.status ||
      influencer.accountStatus ||
      (influencer.active === false ? "bloqueada" : "") ||
      "").toString();
  const normalized = raw.trim().toLowerCase();
  if (["bloqueada", "blocked", "inativa", "inactive"].includes(normalized)) {
    return "bloqueada";
  }
  if (["ativa", "active"].includes(normalized)) {
    return "ativa";
  }
  return "ativa";
};

const resolveAcceptanceStatus = (influencer) => {
  const status = (influencer.acceptanceStatus || "").toLowerCase();
  if (status === "aceito" || status === "completo" || status === "accepted") {
    return "completo";
  }
  if (status === "dispensado" || status === "dispensada") {
    return "dispensado";
  }
  if (status === "pendente" || status === "pending") {
    return "pendente";
  }
  return "desconhecido";
};

export default function InfluencerTable({
  data,
  loading = false,
  onEdit,
  onDelete,
  onResetPassword,
}) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
        Carregando influenciadoras...
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
        Nenhuma influenciadora cadastrada. Clique em &quot;Adicionar Influenciadora&quot; para
        iniciar.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg backdrop-blur">
      <div className="relative overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.28em] text-white/50">
            <tr>
              <th scope="col" className="px-5 py-4 text-left">
                Influenciadora
              </th>
              <th scope="col" className="px-5 py-4 text-left">
                Contatos
              </th>
              <th scope="col" className="px-5 py-4 text-left">
                Identificacao
              </th>
              <th scope="col" className="px-5 py-4 text-left">
                Status
              </th>
              <th scope="col" className="px-5 py-4 text-left">
                Aceite
              </th>
              <th scope="col" className="px-5 py-4 text-left">
                Cadastro
              </th>
              <th scope="col" className="px-5 py-4 text-right">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {data.map((influencer) => {
              const accountStatus = resolveAccountStatus(influencer);
              const acceptanceStatus = resolveAcceptanceStatus(influencer);

              return (
                <tr key={influencer.id} className="hover:bg-white/5 transition">
                  <td className="px-5 py-4 align-top">
                    <div className="space-y-1">
                      <p className="font-semibold text-white">
                        {influencer.nome || influencer.name || "-"}
                      </p>
                      <p className="text-xs text-white/60">{influencer.instagram}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="space-y-1 text-xs text-white/60">
                      <p>{influencer.email || "-"}</p>
                      <p>{formatPhone(influencer.telefone || influencer.contato)}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="space-y-1 text-xs text-white/60">
                      <p>CPF: {influencer.cpf || "-"}</p>
                      <p>Cupom: {influencer.cupom || influencer.coupon || "-"}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${statusStyles[accountStatus] ?? statusStyles.desconhecido}`}
                    >
                      {accountStatus === "bloqueada" ? "Bloqueada" : "Ativa"}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${statusStyles[acceptanceStatus] ?? statusStyles.desconhecido}`}
                    >
                      {acceptanceStatus === "completo"
                        ? "Aceite completo"
                        : acceptanceStatus === "dispensado"
                          ? "Dispensado"
                          : acceptanceStatus === "pendente"
                            ? "Aceite pendente"
                            : "Desconhecido"}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top text-xs text-white/60">
                    {formatDate(influencer.createdAt || influencer.created_at)}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit?.(influencer)}
                        className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:border-pink-300 hover:text-pink-200"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onResetPassword?.(influencer)}
                        className="rounded-full border border-sky-300/40 px-3 py-1 text-xs text-sky-200 hover:bg-sky-500/10"
                      >
                        Resetar senha
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete?.(influencer)}
                        className="rounded-full border border-rose-300/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/10"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
