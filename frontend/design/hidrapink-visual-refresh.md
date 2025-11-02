# HidraPink Influence Manager · Proposta Visual

Os trechos abaixo mostram o recorte atual das telas ("Antes") e a proposta de atualização ("Depois") aplicando a identidade visual HidraPink. Os exemplos preservam a estrutura/lógica existente e focam em classes Tailwind para estilização.

> **Pré-visualização interativa:** para comparar rapidamente os estados atuais e propostos das telas de Login, Dashboard Master e Dashboard da influenciadora, abra `frontend/design/hidrapink-visual-previews.html` no navegador.

## Login

// ======== ANTES ========
```jsx
<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-pink-900 via-slate-950 to-slate-900 text-white">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(228,68,122,0.45),_transparent_60%)]" />
  <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
    {/* ... hero + formulário existentes ... */}
  </div>
</div>
```

// ======== DEPOIS (Identidade HidraPink) ========
```jsx
<div className="min-h-screen bg-gradient-to-br from-[#FBD3DB] via-white to-[#F07999]/10 text-[#431022]">
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(228,68,122,0.12),_transparent_60%)]" />
  <div className="relative z-10 flex min-h-screen flex-col gap-12 lg:flex-row">
    <section className="flex w-full flex-col justify-between px-8 py-14 lg:w-1/2 lg:px-20">
      <header className="space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#E4447A]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-[#E4447A]">
          HidraPink Influence Manager
        </span>
        <h1 className="font-['Agency_FB'] text-5xl font-semibold leading-tight text-[#E4447A]">
          Potencialize sua rede de influenciadoras
        </h1>
        <p className="max-w-lg text-base font-['Qurova_Light'] text-[#431022]/70">
          Faça login para planejar conteúdos, acompanhar performance e reforçar o protagonismo das parceiras HidraPink.
        </p>
      </header>
      <aside className="hidden lg:block">
        <div className="rounded-3xl border border-[#FBD3DB] bg-white/70 p-6 text-[#431022] shadow-[0_25px_50px_-20px_rgba(228,68,122,0.25)]">
          <p className="text-xs uppercase tracking-[0.35em] text-[#E4447A]">Suporte</p>
          <p className="mt-3 text-sm font-['Qurova_Light']">
            Esqueceu suas credenciais? Acesse o canal #hidrapink-suporte ou envie um e-mail para <strong>suporte@hidrapink.com</strong>.
          </p>
        </div>
      </aside>
    </section>

    <section className="flex w-full items-center justify-center px-6 pb-16 lg:w-1/2 lg:px-20">
      <div className="w-full max-w-md rounded-4xl border border-[#FBD3DB] bg-white/90 p-10 shadow-[0_35px_60px_-15px_rgba(240,121,153,0.35)] backdrop-blur">
        <header className="space-y-3 text-center text-[#431022]">
          <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E4447A] px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-white">
            Acesso restrito
          </span>
          <h2 className="font-['Agency_FB'] text-3xl text-[#E4447A]">Entrar no painel</h2>
          <p className="text-xs font-['Qurova_Light'] text-[#431022]/70">
            Use seu e-mail corporativo ou celular com DDD e senha cadastrada.
          </p>
        </header>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2 text-left">
            <label className="text-sm font-semibold text-[#E4447A]" htmlFor="identifier">
              E-mail ou celular
            </label>
            <input
              id="identifier"
              className="w-full rounded-2xl border border-[#FBD3DB] bg-white px-4 py-3 text-sm text-[#431022] shadow-inner focus:border-[#E4447A] focus:outline-none focus:ring-2 focus:ring-[#F07999]/40"
              placeholder="usuario@hidrapink.com ou (11) 98888-7777"
              {...identifierProps}
            />
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-semibold text-[#E4447A]" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              className="w-full rounded-2xl border border-[#FBD3DB] bg-white px-4 py-3 text-sm text-[#431022] shadow-inner focus:border-[#E4447A] focus:outline-none focus:ring-2 focus:ring-[#F07999]/40"
              placeholder="Digite sua senha"
              {...passwordProps}
            />
          </div>

          {error && (
            <p className="rounded-2xl border border-[#F07999]/60 bg-[#F07999]/15 px-4 py-3 text-sm text-[#E4447A]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-[#E4447A] via-[#F07999] to-[#E4447A] px-4 py-3 text-sm font-['Agency_FB'] uppercase tracking-[0.3em] text-white shadow-lg transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#FBD3DB] disabled:opacity-60"
          >
            {loading ? "Validando acesso..." : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-['Qurova_Light'] text-[#431022]/60">
          Ao acessar você concorda com os termos de confidencialidade HidraPink.
        </p>
      </div>
    </section>
  </div>
</div>
```

## Dashboard Master

// ======== ANTES ========
```jsx
<header className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl backdrop-blur">
  <p className="text-xs uppercase tracking-[0.45em] text-pink-200">Dashboard Master</p>
  <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
    {/* saudação + cards */}
  </div>
</header>
<section className="grid gap-4 md:grid-cols-3">
  <StatCard title="Influenciadoras ativas" value={stats.totalInfluencers ?? 0} helper="Com agenda neste ciclo mensal." />
  {/* ... demais cards ... */}
</section>
```

// ======== DEPOIS (Identidade HidraPink) ========
```jsx
<header className="rounded-4xl border border-[#FBD3DB] bg-white/90 p-8 shadow-[0_30px_80px_-25px_rgba(228,68,122,0.35)]">
  <div className="flex flex-wrap items-center justify-between gap-6">
    <div className="space-y-3 text-[#431022]">
      <span className="inline-flex items-center gap-2 rounded-full bg-[#FBD3DB] px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-[#E4447A]">
        Dashboard Master
      </span>
      <h1 className="font-['Agency_FB'] text-4xl text-[#E4447A]">
        Olá, {user.email?.split("@")[0] || "Master"}
      </h1>
      <p className="max-w-xl text-sm font-['Qurova_Light'] text-[#431022]/70">
        Monitore agendas, validações e performance com insights em tempo real.
      </p>
    </div>
    <div className="rounded-3xl border border-[#FBD3DB] bg-[#FBD3DB]/60 px-6 py-4 text-right text-[#431022]">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E4447A]">Ciclo ativo</p>
      <p className="font-['Agency_FB'] text-2xl">{cycleLabel ?? "--/--"}</p>
    </div>
  </div>
</header>

<section className="grid gap-5 md:grid-cols-3">
  <div className="rounded-3xl border border-[#FBD3DB] bg-white/80 p-6 shadow-[0_18px_45px_-20px_rgba(240,121,153,0.4)]">
    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#E4447A]">Influenciadoras ativas</p>
    <p className="mt-3 font-['Agency_FB'] text-4xl text-[#431022]">{stats.totalInfluencers ?? 0}</p>
    <p className="mt-2 text-xs font-['Qurova_Light'] text-[#431022]/70">Com agenda neste ciclo mensal.</p>
  </div>
  {/* repetir estrutura com ícones/gradientes suaves para os outros StatCard */}
</section>
```

## Dashboard Influenciadora (cards + histórico)

// ======== ANTES ========
```jsx
<section className="grid gap-4 md:grid-cols-2">
  <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
    {/* metas do ciclo */}
  </div>
  <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
    {/* status de aceite e próximos stories */}
  </div>
</section>
```

// ======== DEPOIS (Identidade HidraPink) ========
```jsx
<section className="grid gap-6 md:grid-cols-2">
  <div className="rounded-3xl border border-[#FBD3DB] bg-white p-6 shadow-[0_25px_60px_-30px_rgba(228,68,122,0.4)]">
    <h2 className="font-['Agency_FB'] text-2xl text-[#E4447A]">Meta do ciclo</h2>
    <p className="mt-2 text-sm font-['Qurova_Light'] text-[#431022]/75">
      Alcance previsto, stories agendados e pontos estimados.
    </p>
    <div className="mt-6 grid grid-cols-3 gap-4">
      <div className="rounded-2xl bg-[#FBD3DB]/60 p-4 text-center text-[#431022]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E4447A]">Stories</p>
        <p className="mt-2 font-['Agency_FB'] text-3xl">{influencerData?.planner?.planned ?? 0}</p>
      </div>
      {/* ... demais métricas ... */}
    </div>
  </div>

  <div className="rounded-3xl border border-[#FBD3DB] bg-gradient-to-br from-white via-[#FBD3DB]/40 to-white p-6 text-[#431022]">
    <h2 className="font-['Agency_FB'] text-2xl text-[#E4447A]">Termos & próximos passos</h2>
    <ul className="mt-4 space-y-3 text-sm font-['Qurova_Light']">
      <li className="flex items-start gap-3">
        <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#E4447A]" />
        <span>Último aceite: {formatDate(influencerData?.terms?.acceptedAt)}</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#F07999]" />
        <span>Próximo story: {formatDate(influencerData?.nextStory?.scheduled_date)}</span>
      </li>
    </ul>
    <button className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E4447A] via-[#F07999] to-[#E4447A] px-6 py-2 text-sm font-['Agency_FB'] uppercase tracking-[0.25em] text-white shadow-lg">
      Acessar planner
    </button>
  </div>
</section>
```

## Navbar & Sidebar

// ======== ANTES ========
```jsx
<nav className="flex items-center justify-between border-b border-white/10 bg-slate-950/50 px-6 py-4">
  {/* logo + avatar */}
</nav>
<aside className="hidden w-64 flex-col gap-6 border-r border-white/10 bg-slate-950/60 p-6 lg:flex">
  {/* links */}
</aside>
```

// ======== DEPOIS (Identidade HidraPink) ========
```jsx
<nav className="flex items-center justify-between border-b border-[#FBD3DB] bg-white/90 px-8 py-4 text-[#431022] shadow-[0_20px_45px_-25px_rgba(228,68,122,0.35)]">
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E4447A] to-[#F07999] text-white">
      HP
    </div>
    <span className="font-['Agency_FB'] text-2xl text-[#E4447A]">HidraPink</span>
  </div>
  <div className="flex items-center gap-4">
    <button className="inline-flex items-center gap-2 rounded-full border border-[#FBD3DB] px-4 py-2 text-xs font-['Qurova_Light'] uppercase tracking-[0.3em] text-[#E4447A] hover:bg-[#FBD3DB]/60">
      Central de ajuda
    </button>
    <div className="flex items-center gap-3 rounded-full border border-[#FBD3DB] bg-white px-3 py-2 shadow-sm">
      <span className="h-10 w-10 rounded-full bg-gradient-to-br from-[#E4447A] to-[#F07999]" />
      <div className="text-xs font-['Qurova_Light'] leading-tight">
        <p className="font-semibold text-[#E4447A]">{user.name}</p>
        <p className="uppercase tracking-[0.35em] text-[#431022]/60">{user.role}</p>
      </div>
    </div>
  </div>
</nav>

<aside className="hidden w-64 flex-col gap-6 border-r border-[#FBD3DB] bg-white/85 p-6 text-[#431022] lg:flex">
  <div className="text-xs font-semibold uppercase tracking-[0.35em] text-[#E4447A]">Menu</div>
  <nav className="space-y-2">
    {links.map((link) => (
      <button
        key={link.href}
        className={clsx(
          "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-['Qurova_Light'] transition",
          link.active
            ? "bg-gradient-to-r from-[#E4447A] to-[#F07999] text-white shadow-lg"
            : "text-[#431022]/70 hover:bg-[#FBD3DB]/60 hover:text-[#E4447A]"
        )}
      >
        <link.icon className="h-5 w-5" />
        {link.label}
      </button>
    ))}
  </nav>
</aside>
```

## Ajustes de configuração recomendados

### Tailwind (`tailwind.config.js`)
```js
export default {
  theme: {
    extend: {
      colors: {
        hidra: {
          primary: "#E4447A",
          medium: "#F07999",
          light: "#FBD3DB",
          ink: "#431022",
        },
      },
      fontFamily: {
        agency: ["Agency FB", "sans-serif"],
        qurova: ["Qurova Light", "sans-serif"],
      },
      boxShadow: {
        hibloom: "0 35px 60px -15px rgba(228, 68, 122, 0.25)",
      },
    },
  },
};
```

### CSS global (`src/index.css`)
```css
@font-face {
  font-family: "Agency FB";
  src: url("/fonts/AgencyFB.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
}

@font-face {
  font-family: "Qurova Light";
  src: url("/fonts/QurovaLight.woff2") format("woff2");
  font-weight: 300;
  font-style: normal;
}

body {
  @apply bg-white font-qurova text-hidra-ink;
}
```

> Após adicionar as fontes em `public/fonts`, basta aplicar `font-agency` nos títulos e `font-qurova` nos textos para manter consistência.
