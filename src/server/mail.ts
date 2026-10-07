import { mailEnv } from "../lib/env.ts";

export type MailMessage = { to: string; subject: string; text: string; html: string };
export type MailResult = { ok: true } | { ok: false; error: "mail_disabled" | "mail_failed" };

/** Sends one email through Resend's HTTP API. Without RESEND_API_KEY it sends nothing. */
export async function sendMail(
  msg: MailMessage,
  fetchImpl: typeof fetch = fetch,
): Promise<MailResult> {
  const env = mailEnv();
  if (!env) return { ok: false, error: "mail_disabled" };
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    }),
  });
  return response.ok ? { ok: true } : { ok: false, error: "mail_failed" };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** The password-reset email, in Spanish, with a link valid for one hour. */
export function resetPasswordMail(
  name: string,
  link: string,
  shopName: string,
): Omit<MailMessage, "to"> {
  const text = `Hola, ${name}.\n\nPara poner una contraseña nueva en ${shopName}, abre este enlace (vence en 1 hora):\n${link}\n\nSi no lo pediste, ignora este correo: tu contraseña no cambia.`;
  const html = `<p>Hola, ${escapeHtml(name)}.</p><p>Para poner una contraseña nueva en ${escapeHtml(shopName)}, toca este botón. El enlace vence en 1 hora.</p><p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#3b3429;color:#ffffff;border-radius:5px;text-decoration:none">Poner contraseña nueva</a></p><p>Si no lo pediste, ignora este correo: tu contraseña no cambia.</p>`;
  return { subject: `Recupera tu contraseña de ${shopName}`, text, html };
}
