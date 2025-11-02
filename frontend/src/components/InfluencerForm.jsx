import { useEffect, useMemo, useRef, useState } from "react";

const initialState = {
  nome: "",
  instagram: "",
  email: "",
  telefone: "",
  cpf: "",
  cupom: "",
  cep: "",
  numero: "",
  complemento: "",
  logradouro: "",
  bairro: "",
  cidade: "",
  estado: "",
  senha: "",
  dispensaAssinatura: false,
};

const emailRegex =
  /^(?:[\w!#$%&'*+/=?^`{|}~-]+(?:\.[\w!#$%&'*+/=?^`{|}~-]+)*)@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const area = digits.slice(0, 2);
  if (digits.length <= 7) {
    const middle = digits.slice(2);
    return `(${area}) ${middle}`;
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

const formatCPF = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 11)];
  if (digits.length <= 3) return parts[0];
  if (digits.length <= 6) return `${parts[0]}.${parts[1]}`;
  if (digits.length <= 9) return `${parts[0]}.${parts[1]}.${parts[2]}`;
  return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`;
};

const formatCEP = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const normalizeInstagram = (value) =>
  value.replace(/^[\s@]+/, "").replace(/\s+/g, "").replace(/[^A-Za-z0-9._]/g, "").toLowerCase();

const isValidCPF = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) {
      sum += Number(digits[i]) * (len + 1 - i);
    }
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
};

const validateForm = (form) => {
  const errors = {};
  if (!form.nome.trim()) errors.nome = "Informe o nome completo.";
  if (!form.instagram.trim()) errors.instagram = "Informe o usuario do Instagram.";
  const email = form.email.trim();
  if (!email || !emailRegex.test(email)) errors.email = "Informe um email valido.";

  const phoneDigits = form.telefone.replace(/\D/g, "");
  if (phoneDigits.length !== 11) errors.telefone = "Telefone deve conter 11 digitos (DDD + numero).";

  if (!isValidCPF(form.cpf)) errors.cpf = "CPF invalido.";
  if (!form.cupom.trim()) errors.cupom = "Informe o cupom.";

  const cepDigits = form.cep.replace(/\D/g, "");
  if (cepDigits.length !== 8) errors.cep = "CEP invalido.";

  if (!form.numero.trim()) errors.numero = "Informe o numero.";
  if (!form.logradouro.trim()) errors.logradouro = "Informe o logradouro.";
  if (!form.bairro.trim()) errors.bairro = "Informe o bairro.";
  if (!form.cidade.trim()) errors.cidade = "Informe a cidade.";

  const estado = form.estado.trim();
  if (!estado || estado.length !== 2 || !/^[A-Za-z]{2}$/.test(estado)) {
    errors.estado = "UF deve conter duas letras.";
  }

  if (form.senha && form.senha.trim() && form.senha.trim().length < 6) {
    errors.senha = "Senha deve ter pelo menos 6 caracteres.";
  }

  return errors;
};

export default function InfluencerForm({
  initialData,
  onSubmit,
  loading = false,
  mode = "create",
  formId,
}) {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [cepLoading, setCepLoading] = useState(false);
  const lastCepFetched = useRef("");

  useEffect(() => {
    if (!initialData) {
      setForm(initialState);
      setErrors({});
      lastCepFetched.current = "";
      return;
    }

    const formattedTelefone = initialData.telefone ?? initialData.contato ?? "";
    const formattedCep = initialData.cep ?? "";
    const formattedCpf = initialData.cpf ?? "";

    setForm({
      nome: initialData.nome ?? initialData.name ?? "",
      instagram: normalizeInstagram(initialData.instagram ?? ""),
      email: initialData.email ?? "",
      telefone: formattedTelefone ? formatPhone(formattedTelefone) : "",
      cpf: formattedCpf ? formatCPF(formattedCpf) : "",
      cupom: (initialData.cupom ?? initialData.coupon ?? "").toUpperCase(),
      cep: formattedCep ? formatCEP(formattedCep) : "",
      numero: initialData.numero ?? "",
      complemento: initialData.complemento ?? "",
      logradouro: initialData.logradouro ?? "",
      bairro: initialData.bairro ?? "",
      cidade: initialData.cidade ?? "",
      estado: (initialData.estado ?? "").toUpperCase(),
      senha: "",
      dispensaAssinatura: Boolean(
        initialData.contractSignatureWaived ?? initialData.dispensaAssinatura,
      ),
    });
    setErrors({});
    lastCepFetched.current = (formattedCep || "").replace(/\D/g, "");
  }, [initialData]);

  useEffect(() => {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      if (digits.length < 8) {
        lastCepFetched.current = "";
      }
      return;
    }
    if (digits === lastCepFetched.current) {
      return;
    }

    let cancelled = false;
    const fetchCep = async () => {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (!response.ok) {
          throw new Error("CEP request failed");
        }
        const data = await response.json();
        if (cancelled) return;
        if (data.erro) {
          setErrors((prev) => ({ ...prev, cep: "CEP nao encontrado." }));
          lastCepFetched.current = "";
          return;
        }
        setForm((prev) => ({
          ...prev,
          logradouro: prev.logradouro || data.logradouro || "",
          bairro: prev.bairro || data.bairro || "",
          cidade: prev.cidade || data.localidade || "",
          estado: prev.estado || (data.uf ? data.uf.toUpperCase() : ""),
        }));
        setErrors((prev) => ({ ...prev, cep: undefined }));
        lastCepFetched.current = digits;
      } catch (error) {
        if (!cancelled) {
          console.error("Falha ao consultar CEP:", error);
          setErrors((prev) => ({
            ...prev,
            cep: "Nao foi possivel buscar o CEP. Verifique e tente novamente.",
          }));
          lastCepFetched.current = "";
        }
      } finally {
        if (!cancelled) {
          setCepLoading(false);
        }
      }
    };

    fetchCep();
    return () => {
      cancelled = true;
    };
  }, [form.cep]);

  const isEditMode = useMemo(() => mode === "edit", [mode]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (type === "checkbox") {
      updateField(name, checked);
      return;
    }

    let nextValue = value;
    switch (name) {
      case "instagram":
        nextValue = normalizeInstagram(nextValue);
        break;
      case "telefone":
        nextValue = formatPhone(nextValue);
        break;
      case "cpf":
        nextValue = formatCPF(nextValue);
        break;
      case "cep":
        nextValue = formatCEP(nextValue);
        break;
      case "cupom":
        nextValue = nextValue.toUpperCase().replace(/\s+/g, "");
        break;
      case "estado":
        nextValue = nextValue.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
        break;
      case "numero":
        nextValue = nextValue.replace(/\D/g, "");
        break;
      default:
        break;
    }

    updateField(name, nextValue);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      ...form,
      nome: form.nome.trim(),
      instagram: form.instagram.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim(),
      cpf: form.cpf.trim(),
      cupom: form.cupom.trim(),
      cep: form.cep.trim(),
      numero: form.numero.trim(),
      complemento: form.complemento?.trim() ?? "",
      logradouro: form.logradouro.trim(),
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim().toUpperCase(),
      dispensaAssinatura: Boolean(form.dispensaAssinatura),
      senha: form.senha.trim(),
    };

    if (!payload.senha) {
      delete payload.senha;
    }

    onSubmit?.(payload);
  };

  const renderError = (field) =>
    errors[field] ? (
      <p className="mt-1 text-xs text-rose-300" role="alert">
        {errors[field]}
      </p>
    ) : null;

  return (
    <form id={formId} className="space-y-8" onSubmit={handleSubmit}>
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">Informacoes basicas</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-[0.35em] text-white/50" htmlFor="nome">
              Nome completo
            </label>
            <input
              id="nome"
              name="nome"
              autoComplete="name"
              value={form.nome}
              onChange={handleChange}
              placeholder="Nome completo da influenciadora"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
            />
            {renderError("nome")}
          </div>

          <div>
            <label
              className="text-xs uppercase tracking-[0.35em] text-white/50"
              htmlFor="instagram"
            >
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
                placeholder="perfil"
                className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-8 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
              />
            </div>
            {renderError("instagram")}
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.35em] text-white/50" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="exemplo@hidrapink.com"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
            />
            {renderError("email")}
          </div>

          <div>
            <label
              className="text-xs uppercase tracking-[0.35em] text-white/50"
              htmlFor="telefone"
            >
              Telefone / Contato
            </label>
            <input
              id="telefone"
              name="telefone"
              inputMode="tel"
              value={form.telefone}
              onChange={handleChange}
              placeholder="(00) 00000-0000"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
            />
            {renderError("telefone")}
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.35em] text-white/50" htmlFor="cpf">
              CPF
            </label>
            <input
              id="cpf"
              name="cpf"
              inputMode="numeric"
              value={form.cpf}
              onChange={handleChange}
              placeholder="000.000.000-00"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
            />
            {renderError("cpf")}
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.35em] text-white/50" htmlFor="cupom">
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
            {renderError("cupom")}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="flex items-start gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            name="dispensaAssinatura"
            checked={form.dispensaAssinatura}
            onChange={handleChange}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950/60"
          />
          <span>
            Dispensar assinatura eletronica do contrato
            <span className="block text-xs text-white/60">
              Ao dispensar, a influenciadora conseguira acessar o sistema sem assinar o termo.
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">Endereco</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.35em] text-white/50" htmlFor="cep">
              CEP
            </label>
            <input
              id="cep"
              name="cep"
              inputMode="numeric"
              value={form.cep}
              onChange={handleChange}
              placeholder="00000-000"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
            />
            {cepLoading ? (
              <p className="mt-1 text-xs text-white/50">Consultando CEP...</p>
            ) : null}
            {renderError("cep")}
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.35em] text-white/50" htmlFor="numero">
              Numero
            </label>
            <input
              id="numero"
              name="numero"
              inputMode="numeric"
              value={form.numero}
              onChange={handleChange}
              placeholder="Numero"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
            />
            {renderError("numero")}
          </div>

          <div>
            <label
              className="text-xs uppercase tracking-[0.35em] text-white/50"
              htmlFor="complemento"
            >
              Complemento
            </label>
            <input
              id="complemento"
              name="complemento"
              value={form.complemento}
              onChange={handleChange}
              placeholder="Apartamento, bloco, referencia (opcional)"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
            />
          </div>

          <div>
            <label
              className="text-xs uppercase tracking-[0.35em] text-white/50"
              htmlFor="logradouro"
            >
              Logradouro
            </label>
            <input
              id="logradouro"
              name="logradouro"
              value={form.logradouro}
              onChange={handleChange}
              placeholder="Rua, avenida, etc."
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
            />
            {renderError("logradouro")}
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.35em] text-white/50" htmlFor="bairro">
              Bairro
            </label>
            <input
              id="bairro"
              name="bairro"
              value={form.bairro}
              onChange={handleChange}
              placeholder="Bairro"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
            />
            {renderError("bairro")}
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.35em] text-white/50" htmlFor="cidade">
              Cidade
            </label>
            <input
              id="cidade"
              name="cidade"
              value={form.cidade}
              onChange={handleChange}
              placeholder="Cidade"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
            />
            {renderError("cidade")}
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.35em] text-white/50" htmlFor="estado">
              UF
            </label>
            <input
              id="estado"
              name="estado"
              value={form.estado}
              onChange={handleChange}
              placeholder="UF"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
            />
            {renderError("estado")}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <label className="text-xs uppercase tracking-[0.35em] text-white/50" htmlFor="senha">
          {isEditMode ? "Nova senha (opcional)" : "Senha provisoria (opcional)"}
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          value={form.senha}
          onChange={handleChange}
          placeholder={
            isEditMode
              ? "Deixe em branco para manter a senha atual"
              : "Deixe em branco para gerar automaticamente"
          }
          className="w-full rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40"
        />
        {renderError("senha")}
      </section>

    </form>
  );
}
