type MemberCardProps = { name: string; email: string; since: string };

/** The customer's card on Cuenta: a monogram and the date they joined, like a shop membership. */
export function MemberCard({ name, email, since }: MemberCardProps) {
  const initial = (name.trim()[0] ?? "?").toLocaleUpperCase("es-CO");
  return (
    <section
      aria-label="Tu tarjeta de cliente"
      className="unveil relative overflow-hidden rounded-card bg-cocoa p-6 text-on-cocoa md:p-8"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -bottom-16 font-display text-[12rem] leading-none opacity-15 select-none"
      >
        {initial}
      </span>
      <div className="relative flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-full border border-on-cocoa font-display text-4xl"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className="font-display text-3xl break-words">{name}</p>
          <p className="truncate text-sm">{email}</p>
        </div>
      </div>
      <p className="relative mt-8 text-sm">Cliente desde {since}</p>
    </section>
  );
}
