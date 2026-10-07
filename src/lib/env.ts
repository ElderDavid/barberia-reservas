import { z } from "zod";

/**
 * Environment access, split into groups that are validated lazily — on the first call, never at
 * import. A group is required only from the build step that introduces its consumer (blueprint
 * §10, "Required by step"), so earlier gates never depend on later secrets.
 */
export class MissingEnvError extends Error {
  readonly variable: string;

  constructor(variable: string) {
    super(`MissingEnvError: ${variable} is missing or invalid`);
    this.name = "MissingEnvError";
    this.variable = variable;
  }
}

function fail(error: z.ZodError): never {
  throw new MissingEnvError(String(error.issues[0]?.path[0] ?? "unknown"));
}

const required = z.string().min(1);

const dbSchema = z.object({ DATABASE_URL: required });
const authSchema = z.object({ APP_URL: z.url(), BETTER_AUTH_SECRET: z.string().min(32) });
const ownerSchema = z.object({
  OWNER_NAME: required,
  OWNER_EMAIL: z.email(),
  OWNER_PASSWORD: z.string().min(10),
});
const wompiSchema = z.object({ WOMPI_PUBLIC_KEY: required, WOMPI_INTEGRITY_SECRET: required });
const wompiEventsSchema = z.object({ WOMPI_EVENTS_SECRET: required });
const cronSchema = z.object({ CRON_SECRET: z.string().min(16) });

export function dbEnv(): z.infer<typeof dbSchema> {
  const result = dbSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}

export function authEnv(): z.infer<typeof authSchema> {
  const result = authSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}

export function ownerEnv(): z.infer<typeof ownerSchema> {
  const result = ownerSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}

export function wompiEnv(): z.infer<typeof wompiSchema> {
  const result = wompiSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}

export function wompiEventsEnv(): z.infer<typeof wompiEventsSchema> {
  const result = wompiEventsSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}

export function cronEnv(): z.infer<typeof cronSchema> {
  const result = cronSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}

const androidSchema = z.object({
  ANDROID_PACKAGE_NAME: z.string().regex(/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/),
  ANDROID_CERT_SHA256: z.string().min(1),
});

/**
 * The Play Store app's identity, for `/.well-known/assetlinks.json`. Optional: until the app
 * exists this returns null and the file lists no app.
 */
export function androidEnv(): z.infer<typeof androidSchema> | null {
  const result = androidSchema.safeParse(process.env);
  return result.success ? result.data : null;
}

const mailSchema = z.object({ RESEND_API_KEY: z.string().min(1), MAIL_FROM: z.string().min(3) });

/** Resend credentials, or null when mail is not configured (password reset then falls back to WhatsApp). */
export function mailEnv(): z.infer<typeof mailSchema> | null {
  const result = mailSchema.safeParse(process.env);
  return result.success ? result.data : null;
}
