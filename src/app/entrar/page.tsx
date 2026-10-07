"use client";

import { createAuthClient } from "better-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { AppTabBar } from "@/components/site/app-tab-bar";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const authClient = createAuthClient();

/** Only same-site paths, so a crafted link cannot send people elsewhere after signing in. */
function safeReturn(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/cuenta";
}

export default function EntrarPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("restablecida") === "1") setNotice("Contraseña cambiada. Ya puedes entrar.");
    if (params.get("cerrada") === "1") setNotice("Sesión cerrada");
    if (params.get("salir") !== "1") return;
    void authClient.signOut().then(() => setNotice("Sesión cerrada"));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { data, error: signInError } = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (signInError || !data) {
      setPending(false);
      setError("Correo o contraseña incorrectos");
      return;
    }
    const role = (data.user as { role?: string }).role;
    const volver = new URLSearchParams(window.location.search).get("volver");
    router.push(role === "owner" ? "/admin" : safeReturn(volver));
    router.refresh();
  }

  return (
    <>
      <main id="contenido" className="bg-background px-4 py-12 md:py-20">
        <div className="rise mx-auto max-w-md rounded-card border border-hairline bg-surface p-6 md:p-8">
          <h1 className="font-display text-5xl">Entrar</h1>
          <p className="mt-3 text-fg-muted">Tus citas, tus cortes y tu tarjeta de sellos.</p>
          {notice ? (
            <p role="status" className="mt-6 text-success">
              {notice}
            </p>
          ) : null}
          <form method="post" onSubmit={onSubmit} className="mt-8 space-y-5">
            <Field label="Correo" name="email" type="email" autoComplete="email" required />
            <Field
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {error ? (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full">
              Entrar
            </Button>
          </form>
          <p className="mt-4 text-sm">
            <Link href="/recuperar" className="underline underline-offset-4">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
          <div className="mt-8 border-t border-hairline pt-6">
            <p className="text-fg-muted">¿Primera vez aquí?</p>
            <Link
              href="/registro"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-control border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </main>
      <AppTabBar current="cuenta" />
    </>
  );
}
