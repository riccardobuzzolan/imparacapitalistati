import { describe, expect, it } from "vitest";
import { EUROPE, EUROPE_MAP } from "./europe";
import { SOUTH_AMERICA, SOUTH_MAP } from "./south-america";
import { STATES } from "./usa";

describe("dati geografici", () => {
  it("mantiene il numero previsto di aree", () => {
    expect(Object.keys(STATES)).toHaveLength(50);
    expect(Object.keys(EUROPE).length).toBeGreaterThan(40);
    expect(Object.keys(SOUTH_AMERICA)).toHaveLength(12);
  });

  it("fornisce risposte valide per ogni elemento", () => {
    for (const region of [STATES, EUROPE, SOUTH_AMERICA]) {
      for (const item of Object.values(region)) {
        expect(item.state).not.toBe("");
        expect(item.capital).not.toBe("");
        expect(item.answers).toContain(item.capital);
      }
    }
  });

  it("mantiene le mappe SVG delle aree dinamiche", () => {
    expect(EUROPE_MAP).toContain("<svg");
    expect(SOUTH_MAP).toContain("<svg");
  });
});
