---
description: UI, accessibility and copy conventions
paths:
  - "src/app/**/*.tsx"
  - "src/components/**"
---

# UI

- Mobile-first. Test every screen at 320px wide: no horizontal scroll.
- Colors only through token classes (`bg-surface`, `text-fg-muted`, `bg-primary text-primary-fg`…);
  no hex literals outside `src/app/layout.tsx` and `src/app/icons/`.
- Use `Button`, `Field` and `Card` from `src/components/ui/`. Targets ≥ 44px (`min-h-11`).
- Every input has a `<label>`; errors are text in `role="alert"` linked with `aria-describedby`.
- Every list has an empty state, e.g. "No hay citas para este día."
- Links inside running text are underlined (`underline`), so they do not rely on color alone.
- No `<meta http-equiv="refresh">`; offer a link to reload instead.
- Transitions only with `motion-safe:` and 150ms `ease-out`.
- Copy is Spanish (Colombia), "tú" form: "Reserva tu cita", "Cita confirmada", "Pendiente de pago".
- Money renders with `formatCop()` from `src/lib/money.ts`; dates/times with `src/lib/time.ts`
  helpers in the shop time zone, e.g. "lunes 5 de octubre, 9:00 a. m.".
- Pages that read the database export `export const dynamic = "force-dynamic";`.
