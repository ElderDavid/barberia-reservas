import { describe, expect, it } from "vitest";
import { calendarCells, dayPart, monthsLabel } from "../../src/lib/calendar.ts";
import { addDays, localMinutes } from "../../src/lib/time.ts";

describe("calendarCells", () => {
  it("starts a Wednesday under the third column and fills whole weeks", () => {
    // 2026-10-07 is a Wednesday.
    const days = Array.from({ length: 14 }, (_, i) => addDays("2026-10-07", i));
    const cells = calendarCells(days);
    expect(cells.slice(0, 3)).toEqual([null, null, "2026-10-07"]);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean)).toEqual(days);
  });

  it("needs no leading cells for a Monday", () => {
    expect(calendarCells(["2026-10-05"])[0]).toBe("2026-10-05");
  });

  it("is empty for no days", () => {
    expect(calendarCells([])).toEqual([]);
  });
});

describe("monthsLabel", () => {
  it("names one month with its year", () => {
    expect(monthsLabel(["2026-10-07", "2026-10-20"])).toBe("octubre de 2026");
  });

  it("names both months when the days cross into the next one", () => {
    expect(monthsLabel(["2026-10-25", "2026-11-07"])).toBe("octubre – noviembre de 2026");
  });
});

describe("dayPart and localMinutes", () => {
  it("groups Bogotá times into morning, afternoon and evening", () => {
    const zone = "America/Bogota";
    expect(dayPart(localMinutes(new Date("2026-10-07T14:30:00Z"), zone))).toBe("Mañana");
    expect(dayPart(localMinutes(new Date("2026-10-07T17:00:00Z"), zone))).toBe("Tarde");
    expect(dayPart(localMinutes(new Date("2026-10-07T23:00:00Z"), zone))).toBe("Noche");
    expect(localMinutes(new Date("2026-10-07T14:30:00Z"), zone)).toBe(570);
  });
});
