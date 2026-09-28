"use client";

import { createAuthClient } from "better-auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

const authClient = createAuthClient();

export default function EntrarPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("salir") !== "1") return;
    void authClient.signOut().then(() => setSignedOut(true));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setPending(false);
    if (signInError) {
      setError("Correo o contraseña incorrectos");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main id="contenido" className="mx-auto max-w-sm space-y-6 px-4 py-16">
      <h1 className="font-display text-5xl tracking-tight">Entrar</h1>
      <p className="text-fg-muted">Panel del dueño de la barbería.</p>
      {signedOut ? (
        <p role="status" className="text-success">
          Sesión cerrada
        </p>
      ) : null}
      <form method="post" onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="block font-medium">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="min-h-11 w-full rounded-control border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="block font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="min-h-11 w-full rounded-control border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-5 font-medium text-primary-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
