import { Icon, type IconName } from "@/components/ui/icon";

const OPTIONS: { value: string; label: string; hint: string; icon: IconName }[] = [
  {
    value: "cash",
    label: "Efectivo en la barbería",
    hint: "Pagas al terminar tu corte",
    icon: "cash",
  },
  {
    value: "transfer",
    label: "Transferencia (pago completo en línea)",
    hint: "Nequi, PSE o tarjeta con Wompi",
    icon: "card",
  },
];

/** Payment method as large radio cards; the checked one takes the primary color. */
export function PaymentOptions() {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 font-medium">Método de pago</legend>
      {OPTIONS.map((option, i) => (
        <label
          key={option.value}
          className="flex min-h-16 cursor-pointer items-center gap-3 rounded-card border border-border bg-surface p-3 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out active:scale-[0.98]"
        >
          <Icon name={option.icon} className="size-6 shrink-0" />
          <span className="flex-1">
            <span className="block font-medium">{option.label}</span>
            <span className="block text-sm">{option.hint}</span>
          </span>
          <input
            type="radio"
            name="metodo"
            value={option.value}
            defaultChecked={i === 0}
            className="size-5 accent-current"
          />
        </label>
      ))}
    </fieldset>
  );
}
