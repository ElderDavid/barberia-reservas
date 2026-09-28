export type BarListProps = {
  items: { label: string; value: number }[];
  format: (n: number) => string;
};

/** Horizontal bars in plain CSS; widths are relative to the largest value. */
export function BarList({ items, format }: BarListProps) {
  if (items.length === 0) return <p className="text-fg-muted">Sin datos en este periodo.</p>;
  const max = Math.max(...items.map((item) => Math.abs(item.value)));
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const width = max > 0 ? Math.round((Math.abs(item.value) / max) * 100) : 0;
        return (
          <li key={item.label} aria-label={`${item.label}: ${format(item.value)}`}>
            <div className="flex justify-between gap-2 text-sm">
              <span>{item.label}</span>
              <span className={item.value < 0 ? "text-destructive" : ""}>{format(item.value)}</span>
            </div>
            <div className="mt-1 h-2 rounded-control bg-background" aria-hidden="true">
              <div className="h-2 rounded-control bg-primary" style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
