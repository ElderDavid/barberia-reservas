import { describe, expect, it } from "vitest";
import { safeReturnPath } from "../../src/lib/return-path.ts";

describe("safeReturnPath", () => {
  it("keeps same-site paths with their query", () => {
    expect(safeReturnPath("/cuenta/borrar?x=1")).toBe("/cuenta/borrar?x=1");
  });

  it("falls back to /cuenta for anything that leaves the site", () => {
    for (const bad of [
      null,
      "",
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "cuenta",
    ]) {
      expect(safeReturnPath(bad)).toBe("/cuenta");
    }
  });
});
