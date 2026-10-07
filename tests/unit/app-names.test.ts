import { describe, expect, it } from "vitest";
import { appNames } from "../../src/lib/app-names.ts";

describe("appNames", () => {
  it("names the installed app after the shop", () => {
    expect(appNames("BarberStore")).toEqual({
      name: "BarberStore — Reservas",
      shortName: "BarberStore",
    });
  });

  it("trims spaces and falls back to Barbería when the name is empty", () => {
    expect(appNames("  ")).toEqual({ name: "Barbería — Reservas", shortName: "Barbería" });
    expect(appNames("  El Corte ")).toEqual({ name: "El Corte — Reservas", shortName: "El Corte" });
  });

  it("keeps the home-screen label short enough for Android", () => {
    expect(appNames("Barbería Los Hermanos Pérez").shortName).toBe("Barbería Los…");
  });
});
