import type { ReactNode } from "react";

/** One titled block of the Cuenta screen. */
export function AccountSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-hairline bg-surface p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
