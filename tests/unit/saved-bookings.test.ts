import { describe, expect, it } from "vitest";
import { mergeSaved, parseSaved } from "../../src/lib/saved-bookings.ts";

const a = { path: "/cita/aaa", title: "Cita confirmada", when: "lunes" };
const b = { path: "/cita/bbb", title: "Pendiente de pago", when: "martes" };

describe("saved bookings", () => {
  it("puts the newest first and replaces an existing entry for the same link", () => {
    const updated = { ...a, title: "Cita cancelada" };
    expect(mergeSaved([a, b], updated)).toEqual([updated, b]);
  });

  it("keeps at most ten", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...a, path: `/cita/${i}` }));
    expect(mergeSaved(many, b)).toHaveLength(10);
  });

  it("ignores malformed storage and foreign links", () => {
    expect(parseSaved("no es json")).toEqual([]);
    expect(parseSaved(JSON.stringify({ path: "/cita/x" }))).toEqual([]);
    expect(parseSaved(JSON.stringify([a, { ...b, path: "https://evil.example" }, 3]))).toEqual([a]);
  });
});
