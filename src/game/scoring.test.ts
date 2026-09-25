import { describe, expect, it } from "vitest";
import { isAnswerCorrect, normalizeAnswer } from "./scoring";

describe("scoring", () => {
  it("ignora maiuscole e accenti", () => {
    expect(normalizeAnswer("Brasília")).toBe("brasilia");
  });

  it("accetta le varianti configurate", () => {
    expect(isAnswerCorrect("  Roma ", ["Roma", "Rome"])).toBe(true);
  });
});
