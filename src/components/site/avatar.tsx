/** Initials in a circle, standing in for a barber's photo; the name is always shown beside it. */
export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const box = size === "lg" ? "size-16 text-2xl" : "size-12 text-lg";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-cocoa font-display text-on-cocoa ${box}`}
    >
      {initials || "?"}
    </span>
  );
}
