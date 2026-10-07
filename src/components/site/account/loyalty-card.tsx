import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/icon";

type Props = { goal: number; reward: string; onCard: number; full: boolean };

function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase("es-CO") + text.slice(1);
}

/**
 * The punch card: one circle per visit needed, stamped with scissors for each attended visit.
 * The circles are drawing only; the sentence above them says the same thing in words.
 */
export function LoyaltyCard({ goal, reward, onCard, full }: Props) {
  if (goal === 0) return null;
  const left = goal - onCard;
  return (
    <section
      aria-labelledby="fidelidad-titulo"
      className="rounded-card border border-hairline bg-surface p-6 md:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="fidelidad-titulo" className="font-display text-3xl tracking-tight">
          Tarjeta de fidelidad
        </h2>
        <p className="font-display text-2xl">
          {onCard} <span className="text-fg-muted">de {goal}</span>
        </p>
      </div>
      <p className="mt-2 text-fg-muted">
        {full
          ? `¡Ganaste ${lowerFirst(reward)}! Muéstrale esta pantalla al barbero.`
          : `Te ${left === 1 ? "falta 1 visita" : `faltan ${left} visitas`} para ${lowerFirst(reward)}.`}
      </p>
      <ol aria-hidden="true" className="mt-6 grid grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: goal }, (_, i) => {
          const stamped = i < onCard;
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: the circles are positions, not items.
              key={i}
              className={`flex aspect-square items-center justify-center rounded-full ${
                stamped ? "stamp bg-cocoa text-on-cocoa" : "border border-dashed border-border"
              }`}
              style={stamped ? ({ "--i": i } as CSSProperties) : undefined}
            >
              {stamped ? <Icon name="scissors" className="size-1/2 -rotate-12" /> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
