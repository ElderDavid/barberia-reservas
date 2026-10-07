import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMail } from "../../src/server/mail.ts";

const msg = { to: "ana@example.com", subject: "Hola", text: "texto", html: "<p>texto</p>" };

describe("sendMail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled without RESEND_API_KEY and does not call the API", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchImpl = vi.fn();
    expect(await sendMail(msg, fetchImpl)).toEqual({ ok: false, error: "mail_disabled" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts the message to Resend with the key", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "BarberStore <hola@barberstore.co>");
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await sendMail(msg, fetchImpl)).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    expect(JSON.parse(String(init.body))).toEqual({
      from: "BarberStore <hola@barberstore.co>",
      to: ["ana@example.com"],
      subject: "Hola",
      text: "texto",
      html: "<p>texto</p>",
    });
  });

  it("reports a failed delivery", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "x@example.com");
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 422 }));
    expect(await sendMail(msg, fetchImpl)).toEqual({ ok: false, error: "mail_failed" });
  });
});
