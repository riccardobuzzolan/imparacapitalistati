import { describe, expect, it } from "vitest";
import { exportProgress, importProgress } from "./progress";

describe("progress import/export", () => {
  it("mantiene i dati", () => {
    const progress = {
      europe: { IT: { status: "learned" as const, attempts: 1 } },
    };
    expect(importProgress(exportProgress(progress))).toEqual(progress);
  });

  it("rifiuta valori non strutturati", () => {
    expect(() => importProgress("[]")).toThrow();
  });
});
