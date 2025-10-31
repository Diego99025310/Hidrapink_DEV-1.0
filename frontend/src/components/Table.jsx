export default function Table({
  columns,
  data,
  loading = false,
  emptyMessage = "Nenhum registro encontrado.",
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-lg">
      <div className="relative overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/60">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key || column.label}
                  scope="col"
                  className="px-4 py-3 text-left font-semibold"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-sm text-white/60"
                >
                  Carregando...
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((row, index) => (
                <tr
                  key={row.id ?? index}
                  className="hover:bg-white/5 transition"
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
                  className="px-4 py-6 text-center text-sm text-white/50"
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
