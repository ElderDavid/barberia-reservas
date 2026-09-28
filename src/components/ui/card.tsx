import type { ReactNode } from "react";

export type CardProps = { title?: string; children: ReactNode; className?: string };

export function Card({ title, children, className }: CardProps) {
  const classes = ["rounded-card border border-hairline bg-surface p-5 sm:p-6", className]
    .filter(Boolean)
    .join(" ");
  return (
    <section className={classes}>
      {title ? <h2 className="font-display text-2xl tracking-tight">{title}</h2> : null}
      {children}
    </section>
  );
}
