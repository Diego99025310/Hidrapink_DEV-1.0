export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-[0.25em] text-white/80">
          Acesso nao autorizado
        </h1>
        <p className="text-sm text-white/60">
          Voce nao possui permissao para acessar esta area. Utilize o menu para navegar
          para outra pagina.
        </p>
      </div>
    </div>
  );
}
