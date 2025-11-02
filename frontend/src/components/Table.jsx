export default function Table({
  columns,
  data,
  loading = false,
  emptyMessage = "Nenhum registro encontrado.",
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-brand-light bg-white/90 shadow-brand-soft">
      <div className="relative overflow-x-auto">
        <table className="min-w-full divide-y divide-brand-light/60 text-sm text-ink">
          <thead className="bg-brand-light/60 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-brand">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key || column.label}
                  scope="col"
                  className="px-4 py-3 text-left"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-light/40">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-sm text-ink/60"
                >
                  Carregando...
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((row, index) => (
                <tr
                  key={row.id ?? index}
                  className="transition hover:bg-brand-light/40"
                >
                  {columns.map((column) => (
                    <td key={column.key || column.label} className="px-4 py-4 align-top">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-sm text-ink/60"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
