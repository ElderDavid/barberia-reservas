import Link from "next/link";
import type { ReactNode } from "react";
import { requireOwner } from "@/server/session";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/ventas", label: "Ventas" },
  { href: "/admin/gastos", label: "Gastos" },
  { href: "/admin/resumen", label: "Resumen" },
  { href: "/admin/ajustes", label: "Ajustes" },
  { href: "/entrar?salir=1", label: "Salir" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  return (
    <div className="space-y-6">
      <nav aria-label="Panel" className="border-b border-border pb-3">
        <ul className="flex flex-wrap gap-2">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex min-h-11 items-center rounded-control px-3 text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
