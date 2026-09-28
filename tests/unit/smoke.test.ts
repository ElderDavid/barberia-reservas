import { describe, expect, it } from "vitest";
import { dbEnv, MissingEnvError } from "../../src/lib/env.ts";

describe("env groups", () => {
  it("throws a named MissingEnvError when DATABASE_URL is missing", () => {
    const saved = process.env.DATABASE_URL;
    Reflect.deleteProperty(process.env, "DATABASE_URL");
    try {
      expect(() => dbEnv()).toThrow(MissingEnvError);
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved;
    }
  });

  it("returns the value when DATABASE_URL is present", () => {
    const saved = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://example/db";
    try {
      expect(dbEnv().DATABASE_URL).toBe("postgres://example/db");
    } finally {
      if (saved === undefined) Reflect.deleteProperty(process.env, "DATABASE_URL");
      else process.env.DATABASE_URL = saved;
    }
  });
});
