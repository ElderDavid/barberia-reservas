import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Button } from "../../src/components/ui/button.tsx";
import { Card } from "../../src/components/ui/card.tsx";
import { Field } from "../../src/components/ui/field.tsx";
import { formatCop, parseCop } from "../../src/lib/money.ts";

const TOKENS = [
  "--background",
  "--surface",
  "--border",
  "--fg",
  "--fg-muted",
  "--primary",
  "--primary-fg",
  "--destructive",
  "--success",
];

function definedTokens(block: string): string[] {
  return TOKENS.filter((token) => new RegExp(`${token}\\s*:`).test(block));
}

function tsxFiles(dir: string): string[] {
  return (readdirSync(dir, { recursive: true }) as string[])
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => join(dir, file).replaceAll("\\", "/"));
}

describe("design tokens", () => {
  const css = readFileSync("src/app/globals.css", "utf8");

  it("defines every token in the light :root block", () => {
    const light = css.match(/^:root\s*\{([^}]*)\}/m)?.[1] ?? "";
    expect(definedTokens(light)).toEqual(TOKENS);
  });

  it("defines every token in the dark color-scheme block", () => {
    const dark =
      css.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(definedTokens(dark)).toEqual(TOKENS);
  });

  it("has no hex color literals in components or pages", () => {
    const files = [...tsxFiles("src/components"), ...tsxFiles("src/app")].filter(
      (file) => file !== "src/app/layout.tsx" && !file.startsWith("src/app/icons/"),
    );
    const offenders = files.filter((file) =>
      /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});

describe("ui primitives and money", () => {
  it("exports Button, Field and Card as functions", () => {
    expect(typeof Button).toBe("function");
    expect(typeof Field).toBe("function");
    expect(typeof Card).toBe("function");
  });

  it("parses and formats COP", () => {
    expect(parseCop("$ 15.000")).toBe(15000);
    expect(parseCop("abc")).toBeNull();
    expect(formatCop(15000)).toMatch(/15\.000/);
  });
});
