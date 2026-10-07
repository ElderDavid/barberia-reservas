import { Icon } from "@/components/ui/icon";

const SIZES = { sm: "size-4", md: "size-5", lg: "size-7" } as const;

const TONES = {
  default: { on: "text-fg", off: "text-border" },
  "on-ink": { on: "text-on-ink", off: "text-on-ink-muted" },
} as const;

type StarsProps = { rating: number; size?: keyof typeof SIZES; tone?: keyof typeof TONES };

/** Read-only stars; screen readers hear "4 de 5 estrellas" once instead of five shapes. */
export function Stars({ rating, size = "md", tone = "default" }: StarsProps) {
  const filled = Math.round(rating);
  const colors = TONES[tone];
  return (
    <span role="img" aria-label={`${filled} de 5 estrellas`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          className={`${SIZES[size]} ${n <= filled ? `fill-current ${colors.on}` : colors.off}`}
        />
      ))}
    </span>
  );
}
