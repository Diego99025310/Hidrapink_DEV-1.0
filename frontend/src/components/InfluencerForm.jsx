import { useEffect, useState } from "react";

const initialState = {
  nome: "",
  instagram: "",
  email: "",
  telefone: "",
  cpf: "",
  cupom: "",
  senha: "",
};

export default function InfluencerForm({
  initialData,
  onSubmit,
  loading = false,
  mode = "create",
}) {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (!initialData) {
      setForm(initialState);
      return;
    }

    setForm({
      nome: initialData.nome ?? initialData.name ?? "",
      instagram: (initialData.instagram || "").replace(/^@/, ""),
      email: initialData.email ?? "",
      telefone: initialData.contato ?? initialData.contact ?? initialData.telefone ?? "",
      cpf: initialData.cpf ?? "",
      cupom: initialData.cupom ?? initialData.coupon ?? "",
      senha: "",
    });
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.nome || !form.instagram) {
      return;
    }
    onSubmit?.({
      ...form,
      instagram: form.instagram.trim(),
    });
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="md:col-span-2">
        <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="nome">
          Nome completo
        </label>
        <input
          id="nome"
          name="nome"
          value={form.nome}
          onChange={handleChange}
          required
          placeholder="Nome completo da influenciadora"
          className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="instagram">
          Instagram
        </label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40">
            @
          </span>
          <input
            id="instagram"
            name="instagram"
            value={form.instagram}
            onChange={handleChange}
            required
            placeholder="perfil"
            className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-8 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
          />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="exemplo@hidrapink.com"
          className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="telefone">
          Telefone
        </label>
        <input
          id="telefone"
          name="telefone"
          value={form.telefone}
          onChange={handleChange}
          placeholder="(00) 00000-0000"
          className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="cpf">
          CPF
        </label>
        <input
          id="cpf"
          name="cpf"
          value={form.cpf}
          onChange={handleChange}
          placeholder="000.000.000-00"
          className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="cupom">
          Cupom
        </label>
        <input
          id="cupom"
          name="cupom"
          value={form.cupom}
          onChange={handleChange}
          placeholder="CUPOM"
          className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
        />
      </div>

      <div className="md:col-span-2">
        <label className="text-xs uppercase tracking-[0.35em] text-white/40" htmlFor="senha">
          {mode === "create" ? "Senha provisoria" : "Nova senha (opcional)"}
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          value={form.senha}
          onChange={handleChange}
          placeholder={mode === "create" ? "Minimo 6 caracteres" : "Deixe em branco para manter a atual"}
          className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
        />
      </div>

      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:from-pink-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Salvando..." : mode === "create" ? "Cadastrar" : "Salvar alteracoes"}
        </button>
      </div>
    </form>
  );
}
