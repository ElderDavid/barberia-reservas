import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { guardarFidelidad } from "./actions";

/** "Fidelidad" block of Ajustes: visits per reward (0 turns the card off) and the reward. */
export function LoyaltySettings({ goal, reward }: { goal: number; reward: string }) {
  return (
    <Card title="Fidelidad">
      <p className="mt-1 text-sm text-fg-muted">
        Cada cita atendida de un cliente con cuenta llena un sello. Con 0 sellos la tarjeta se
        apaga.
      </p>
      <form action={guardarFidelidad} className="mt-3 space-y-3">
        <Field
          label="Sellos para el premio"
          name="sellos"
          type="number"
          min={0}
          max={30}
          defaultValue={goal}
          required
        />
        <Field
          label="Premio"
          name="premio"
          maxLength={60}
          defaultValue={reward}
          hint="Por ejemplo: Corte gratis"
          required
        />
        <Button type="submit">Guardar fidelidad</Button>
      </form>
    </Card>
  );
}
