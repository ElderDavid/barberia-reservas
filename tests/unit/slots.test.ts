import { describe, expect, it } from "vitest";
import { generateSlots, type SlotInput } from "../../src/server/booking/slots.ts";

const bogota: SlotInput = {
  timeZone: "America/Bogota",
  day: "2026-10-05",
  windows: [{ start: "09:00", end: "19:00" }],
  busy: [],
  durationMinutes: 30,
  bufferAfterMinutes: 0,
  intervalMinutes: 15,
  minNoticeMinutes: 60,
  maxAdvanceDays: 400,
  now: new Date("2026-10-01T00:00:00Z"),
};

const iso = (slots: Date[]) => slots.map((slot) => slot.toISOString());

describe("generateSlots", () => {
  it("Bogotá: 39 slots from 09:00 to 18:30 local", () => {
    const slots = iso(generateSlots(bogota));
    expect(slots).toHaveLength(39);
    expect(slots[0]).toBe("2026-10-05T14:00:00.000Z");
    expect(slots.at(-1)).toBe("2026-10-05T23:30:00.000Z");
  });

  it("Santiago spring-forward skips the missing hour", () => {
    const slots = generateSlots({
      ...bogota,
      timeZone: "America/Santiago",
      day: "2026-09-06",
      windows: [{ start: "00:00", end: "02:00" }],
      intervalMinutes: 30,
      minNoticeMinutes: 0,
      now: new Date("2026-09-01T00:00:00Z"),
    });
    expect(iso(slots)).toEqual(["2026-09-06T04:00:00.000Z", "2026-09-06T04:30:00.000Z"]);
  });

  it("Santiago fall-back uses the first occurrence of a repeated time", () => {
    const slots = generateSlots({
      ...bogota,
      timeZone: "America/Santiago",
      day: "2026-04-04",
      windows: [{ start: "22:30", end: "23:30" }],
      intervalMinutes: 30,
      minNoticeMinutes: 0,
      now: new Date("2026-04-01T00:00:00Z"),
    });
    expect(iso(slots)).toEqual(["2026-04-05T01:30:00.000Z", "2026-04-05T02:00:00.000Z"]);
  });

  it("Kolkata handles a half-hour offset", () => {
    const slots = generateSlots({
      ...bogota,
      timeZone: "Asia/Kolkata",
      windows: [{ start: "09:00", end: "10:00" }],
      intervalMinutes: 30,
      minNoticeMinutes: 0,
    });
    expect(iso(slots)).toEqual(["2026-10-05T03:30:00.000Z", "2026-10-05T04:00:00.000Z"]);
  });

  it("buffer after the service keeps clear of busy ranges", () => {
    const slots = iso(
      generateSlots({
        ...bogota,
        bufferAfterMinutes: 10,
        minNoticeMinutes: 0,
        busy: [{ from: new Date("2026-10-05T15:00:00Z"), until: new Date("2026-10-05T15:45:00Z") }],
      }),
    );
    expect(slots).toContain("2026-10-05T14:15:00.000Z");
    expect(slots).toContain("2026-10-05T15:45:00.000Z");
    for (const blocked of [
      "2026-10-05T14:30:00.000Z",
      "2026-10-05T14:45:00.000Z",
      "2026-10-05T15:00:00.000Z",
      "2026-10-05T15:15:00.000Z",
      "2026-10-05T15:30:00.000Z",
    ]) {
      expect(slots).not.toContain(blocked);
    }
  });

  it("minimum notice moves the first slot", () => {
    const slots = generateSlots({ ...bogota, now: new Date("2026-10-05T14:10:00Z") });
    expect(slots[0].toISOString()).toBe("2026-10-05T15:15:00.000Z");
  });

  it("days beyond the booking horizon have no slots", () => {
    expect(generateSlots({ ...bogota, maxAdvanceDays: 2 })).toEqual([]);
  });
});
