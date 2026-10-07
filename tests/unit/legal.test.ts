import { describe, expect, it } from "vitest";
import { type LegalInfo, legalGaps } from "../../src/lib/legal.ts";

const full: LegalInfo = {
  shopName: "BarberStore",
  address: "Calle 1 # 2-3",
  whatsappPhone: "573001112233",
  legalName: "Ana Gómez",
  legalIdType: "CC",
  legalIdNumber: "12345678",
  privacyEmail: "datos@example.com",
  cancelCutoffHours: 4,
};

describe("legalGaps", () => {
  it("lists every missing responsible-party field", () => {
    expect(
      legalGaps({ ...full, legalName: "", legalIdType: "", legalIdNumber: "", privacyEmail: "" }),
    ).toEqual([
      "nombre del responsable",
      "tipo de documento",
      "número de documento",
      "correo para datos personales",
    ]);
  });

  it("is empty when everything is filled", () => {
    expect(legalGaps(full)).toEqual([]);
  });
});
