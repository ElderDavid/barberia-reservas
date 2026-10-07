import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";

export type AppTab = "inicio" | "reservar" | "mis-citas" | "cuenta";

const TABS: { id: AppTab; label: string; href: string; icon: IconName }[] = [
  { id: "inicio", label: "Inicio", href: "/", icon: "home" },
  { id: "reservar", label: "Reservar", href: "/reservar", icon: "calendar" },
  { id: "mis-citas", label: "Mis citas", href: "/mis-citas", icon: "ticket" },
  { id: "cuenta", label: "Cuenta", href: "/cuenta", icon: "user" },
];

/**
 * Bottom tab bar, as in a phone app; only below the `md` breakpoint, where the header keeps just
 * the essentials. The spacer keeps the footer's last line from hiding behind the bar.
 */
export function AppTabBar({ current }: { current?: AppTab }) {
  return (
    <>
      <div aria-hidden="true" className="h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav
        aria-label="Navegación de la app"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map((tab) => {
            const active = tab.id === current;
            return (
              <li key={tab.id}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out active:scale-95 ${
                    active ? "font-semibold text-fg" : "text-fg-muted"
                  }`}
                >
                  <span
                    className={`flex h-8 w-14 items-center justify-center rounded-full ${
                      active ? "bg-primary text-primary-fg" : ""
                    }`}
                  >
                    <Icon name={tab.icon} />
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
