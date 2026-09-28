import type { ReactNode } from "react";

export type CardProps = { title?: string; children: ReactNode; className?: string };

export function Card({ title, children, className }: CardProps) {
  const classes = ["rounded-card border border-border bg-surface p-4", className]
    .filter(Boolean)
    .join(" ");
  return (
    <section className={classes}>
      {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
      {children}
    </section>
  );
}
