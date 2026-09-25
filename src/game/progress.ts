export type ProgressEntry = {
  status?: "new" | "review" | "learned";
  attempts?: number;
  correct?: number;
  wrong?: number;
  last?: number;
};

export type ProgressStore = Record<string, Record<string, ProgressEntry>>;

export function loadProgress(key: string): ProgressStore {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    return value && typeof value === "object" ? (value as ProgressStore) : {};
  } catch {
    return {};
  }
}

export function saveProgress(key: string, value: ProgressStore): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function exportProgress(value: ProgressStore): string {
  return JSON.stringify(value, null, 2);
}

export function importProgress(serialized: string): ProgressStore {
  const value: unknown = JSON.parse(serialized);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Formato progressi non valido");
  }
  return value as ProgressStore;
}
