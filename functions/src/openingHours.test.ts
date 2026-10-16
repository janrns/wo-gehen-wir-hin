import { describe, expect, it } from "vitest";
import { berlinOffsetMinutes, isOpenDuring } from "./openingHours";

// Freitag, 23.10.2026, 19:00 in Berlin (UTC+2) = 17:00 UTC
const FRI_19 = Date.UTC(2026, 9, 23, 17, 0);

const regular = (periods: [number, number, number, number, number, number][]) => ({
  utcOffsetMinutes: 120,
  regularOpeningHours: {
    periods: periods.map(([od, oh, om, cd, ch, cm]) => ({
      open: { day: od, hour: oh, minute: om },
      close: { day: cd, hour: ch, minute: cm },
    })),
  },
});

describe("isOpenDuring", () => {
  it("geöffnet, wenn das Zeitfenster vollständig in den Öffnungszeiten liegt", () => {
    expect(isOpenDuring(regular([[5, 17, 0, 5, 23, 0]]), FRI_19, 2)).toBe(true);
  });

  it("nicht geöffnet, wenn das Lokal mitten im Zeitfenster schließt", () => {
    expect(isOpenDuring(regular([[5, 11, 0, 5, 19, 30]]), FRI_19, 2)).toBe(false);
  });

  it("berücksichtigt Öffnungszeiten über Mitternacht", () => {
    expect(isOpenDuring(regular([[5, 18, 0, 6, 2, 0]]), FRI_19, 4)).toBe(true);
  });

  it("berücksichtigt den Wochenwechsel (Samstag bis Sonntag früh)", () => {
    const sat23 = Date.UTC(2026, 9, 24, 21, 0);
    expect(isOpenDuring(regular([[6, 20, 0, 0, 3, 0]]), sat23, 2)).toBe(true);
  });

  it("erkennt rund um die Uhr geöffnet", () => {
    expect(isOpenDuring({ regularOpeningHours: { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] } }, FRI_19, 3)).toBe(true);
  });

  it("liefert null ohne Öffnungszeiten", () => {
    expect(isOpenDuring({}, FRI_19, 2)).toBeNull();
  });

  it("tagesaktuelle Zeiten (z. B. Feiertag geschlossen) haben Vorrang", () => {
    const place = {
      ...regular([[5, 17, 0, 5, 23, 0]]),
      currentOpeningHours: {
        periods: [
          {
            open: { day: 4, hour: 17, minute: 0, date: { year: 2026, month: 10, day: 22 } },
            close: { day: 4, hour: 23, minute: 0, date: { year: 2026, month: 10, day: 22 } },
          },
          {
            open: { day: 6, hour: 17, minute: 0, date: { year: 2026, month: 10, day: 24 } },
            close: { day: 6, hour: 23, minute: 0, date: { year: 2026, month: 10, day: 24 } },
          },
        ],
      },
    };
    expect(isOpenDuring(place, FRI_19, 2)).toBe(false);
  });

  it("nutzt reguläre Zeiten, wenn der Termin außerhalb der tagesaktuellen Daten liegt", () => {
    const place = {
      ...regular([[5, 17, 0, 5, 23, 0]]),
      currentOpeningHours: {
        periods: [
          {
            open: { day: 4, hour: 17, minute: 0, date: { year: 2026, month: 10, day: 15 } },
            close: { day: 4, hour: 23, minute: 0, date: { year: 2026, month: 10, day: 15 } },
          },
        ],
      },
    };
    expect(isOpenDuring(place, FRI_19, 2)).toBe(true);
  });
});

describe("berlinOffsetMinutes", () => {
  it("Sommer- und Winterzeit", () => {
    expect(berlinOffsetMinutes(Date.UTC(2026, 6, 1, 12))).toBe(120);
    expect(berlinOffsetMinutes(Date.UTC(2026, 11, 1, 12))).toBe(60);
  });
});
