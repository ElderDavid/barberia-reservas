import type { ReactNode } from "react";
import { AppTabBar } from "@/components/site/app-tab-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

type AuthShellProps = {
  shop: { name: string; address: string };
  whatsappHref?: string;
  eyebrow: string;
  title: string;
  intro: ReactNode;
  children: ReactNode;
};

/** Narrow card layout shared by the sign-in, sign-up and password screens. */
export function AuthShell({ shop, whatsappHref, eyebrow, title, intro, children }: AuthShellProps) {
  return (
    <>
      <SiteHeader shopName={shop.name} whatsappHref={whatsappHref} />
      <main id="contenido" className="bg-background px-4 py-12 md:py-20">
        <div className="rise mx-auto max-w-md rounded-card border border-hairline bg-surface p-6 md:p-8">
          <p className="text-xs font-medium tracking-[0.2em] text-fg-muted uppercase">{eyebrow}</p>
          <h1 className="mt-2 font-display text-4xl">{title}</h1>
          <div className="mt-3 text-fg-muted">{intro}</div>
          <div className="mt-8 space-y-5">{children}</div>
        </div>
      </main>
      <SiteFooter
        shopName={shop.name}
        address={shop.address || undefined}
        whatsappHref={whatsappHref}
      />
      <AppTabBar />
    </>
  );
}
