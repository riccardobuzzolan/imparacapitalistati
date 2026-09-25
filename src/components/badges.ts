export function badgeLabel(status: string, capital: string): string {
  if (status === "learned") return `✓ ${capital}`;
  if (status === "review") return "Da rivedere";
  return "Nuovo";
}
