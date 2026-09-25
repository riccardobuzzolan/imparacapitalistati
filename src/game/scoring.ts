export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isAnswerCorrect(
  value: string,
  accepted: readonly string[],
): boolean {
  const normalized = normalizeAnswer(value);
  return accepted.some((answer) => normalizeAnswer(answer) === normalized);
}
