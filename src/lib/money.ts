const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Integer COP → display text, e.g. 15000 → "$ 15.000". Use only at render time. */
export function formatCop(value: number): string {
  return copFormatter.format(value);
}

/** Free-form text typed by a person → integer COP, or null when it has no digits. */
export function parseCop(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  return digits === "" ? null : Number.parseInt(digits, 10);
}
