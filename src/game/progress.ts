export type ProgressEntry = {
  status?: "new" | "review" | "learned";
  attempts?: number;
  correct?: number;
  wrong?: number;
  last?: number;
};
export type ProgressStore = Record<string, Record<string, ProgressEntry>>;
export type StorageArea = Pick<Storage, "getItem" | "setItem" | "removeItem"> &
  Partial<Pick<Storage, "key" | "length">>;
export type ProgressWriteResult = {
  ok: boolean;
  blocked?: boolean;
  warning?: string;
  rollbackComplete?: boolean;
  originals?: Record<string, string>;
};
export const PROGRESS_VERSION = 1,
  MAX_BACKUP_BYTES = 5000000;
const FORMAT = "memory-atlas-progress-backup",
  ORIGINALS_WRAPPER = "memory-atlas-preserved-originals";
const REGIONS = new Set(["usa", "europe", "south"]),
  FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);
const COUNTERS = ["attempts", "correct", "wrong"] as const;
type Metadata = {
  key?: string;
  area?: StorageArea;
  originals: Record<string, string>;
};
type KeyState = {
  raw: string | null;
  writable: boolean;
  migration: boolean;
  data: ProgressStore;
  originals: Record<string, string>;
};
const states = new WeakMap<StorageArea, Map<string, KeyState>>(),
  stores = new WeakMap<ProgressStore, Metadata>(),
  warnings = new Map<string, string>();
let replacementSequence = 0;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const invalid = () =>
  new Error("Formato progressi non valido: controlla stati e contatori.");
function bounded(raw: string): void {
  if (
    raw.length > MAX_BACKUP_BYTES ||
    new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES
  )
    throw new Error(
      "Il backup supera il limite di 5 MB. I dati originali sono conservati.",
    );
}
function areaOrDefault(area?: StorageArea): StorageArea | undefined {
  if (area) return area;
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
function warning(key: string, message?: string): void {
  if (message) warnings.set(key, message);
  else warnings.delete(key);
}
export function getProgressWarning(key: string): string | undefined {
  return warnings.get(key);
}

/** Keep safe future territory IDs, reject prototype keys and invalid counters. */
export function validateProgress(value: unknown): ProgressStore {
  if (!object(value)) throw invalid();
  const result: ProgressStore = {};
  for (const [region, entries] of Object.entries(value)) {
    if (!REGIONS.has(region) || FORBIDDEN.has(region) || !object(entries))
      throw invalid();
    const rows: Record<string, ProgressEntry> = {};
    for (const [code, item] of Object.entries(entries)) {
      if (
        !/^[A-Z][A-Z0-9_-]{0,11}$/.test(code) ||
        FORBIDDEN.has(code) ||
        !object(item) ||
        Object.keys(item).some((key) => FORBIDDEN.has(key))
      )
        throw invalid();
      const entry: ProgressEntry = {},
        status = item.status;
      if (status !== undefined) {
        if (status !== "new" && status !== "review" && status !== "learned")
          throw invalid();
        entry.status = status;
      }
      for (const field of COUNTERS) {
        const count = item[field];
        if (count === undefined) continue;
        if (
          typeof count !== "number" ||
          !Number.isSafeInteger(count) ||
          count < 0
        )
          throw invalid();
        entry[field] = count;
      }
      const last = item.last;
      if (last !== undefined) {
        if (
          typeof last !== "number" ||
          !Number.isSafeInteger(last) ||
          last < 0 ||
          last > 8640000000000000
        )
          throw invalid();
        entry.last = last;
      }
      rows[code] = entry;
    }
    result[region] = rows;
  }
  return result;
}

/** Unpack metadata only; keep each distinct exact original without recursive wrappers. */
export function normalizeOriginals(
  ...sources: Record<string, unknown>[]
): Record<string, string> {
  const pending = sources
    .flatMap((source) =>
      Object.entries(source).filter(([, value]) => typeof value === "string"),
    )
    .reverse();
  const values = new Set<string>(),
    originals = new Map<string, string>();
  while (pending.length) {
    const [label, value] = pending.pop()!;
    let key = label;
    const raw = value as string;
    if (key === ORIGINALS_WRAPPER) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (
          object(parsed) &&
          Object.values(parsed).every((entry) => typeof entry === "string")
        ) {
          const entries = Object.entries(parsed);
          for (let index = entries.length - 1; index >= 0; index--)
            pending.push(entries[index]);
          continue;
        }
      } catch {
        /* Keep corrupt metadata verbatim below. */
      }
      key = ORIGINALS_WRAPPER + ":raw-original";
    }
    if (values.has(raw)) continue;
    const base = key;
    let variant = 1;
    while (originals.has(key)) key = base + ":variant:" + ++variant;
    originals.set(key, raw);
    values.add(raw);
  }
  return Object.fromEntries(
    [...originals].sort(([a], [b]) => a.localeCompare(b)),
  );
}
function metadataOriginals(
  key: string,
  area?: StorageArea,
  includeActive = true,
): Record<string, string> {
  if (!area) return {};
  const source: Record<string, unknown> = {};
  for (const name of [
    ...(includeActive ? [key] : []),
    key + ":before-migration",
    key + ":before-replace",
  ])
    try {
      const raw = area.getItem(name);
      if (raw !== null) source[name] = raw;
    } catch {
      /* Cached originals are still usable. */
    }
  try {
    const raw = area.getItem(key + ":originals");
    if (raw !== null) source[ORIGINALS_WRAPPER] = raw;
    if (area.key && typeof area.length === "number")
      for (let index = 0; index < area.length; index++) {
        const name = area.key(index);
        if (name?.startsWith(key + ":recovery:")) {
          const original = area.getItem(name);
          if (original !== null) source[name] = original;
        }
      }
  } catch {
    /* Do not erase cached originals on denied reads. */
  }
  return normalizeOriginals(source);
}
function register(key: string, area: StorageArea, state: KeyState): void {
  let entries = states.get(area);
  if (!entries) {
    entries = new Map();
    states.set(area, entries);
  }
  entries.set(key, state);
}
function readState(key: string, area?: StorageArea): KeyState {
  const fallback: KeyState = {
    raw: null,
    writable: false,
    migration: false,
    data: {},
    originals: {},
  };
  if (!area) {
    warning(
      key,
      "Il salvataggio locale non è disponibile. Esporta il JSON per conservare la sessione.",
    );
    return fallback;
  }
  let raw: string | null;
  try {
    raw = area.getItem(key);
  } catch {
    warning(
      key,
      "Il salvataggio locale non è disponibile. Esporta il JSON per conservare la sessione.",
    );
    register(key, area, fallback);
    return fallback;
  }
  let state: KeyState = {
    ...fallback,
    raw,
    originals: metadataOriginals(key, area),
  };
  if (raw === null) {
    state = { ...state, writable: true };
    warning(key);
  } else
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!object(parsed)) throw invalid();
      const wrapped = Object.hasOwn(parsed, "version");
      if (
        wrapped &&
        parsed.version !== 0 &&
        parsed.version !== PROGRESS_VERSION
      )
        warning(
          key,
          "Versione dei progressi non supportata. L’originale è conservato; questa sessione rimane temporanea.",
        );
      else {
        const source = wrapped ? parsed.data : parsed,
          data = validateProgress(source);
        state = {
          ...state,
          data,
          writable: true,
          migration:
            !wrapped ||
            parsed.version !== PROGRESS_VERSION ||
            Object.keys(parsed).some(
              (field) => wrapped && field !== "version" && field !== "data",
            ) ||
            JSON.stringify(source) !== JSON.stringify(data),
        };
        warning(key);
      }
    } catch {
      warning(
        key,
        "I progressi locali non sono leggibili. L’originale è conservato; esportalo prima di reimpostare.",
      );
    }
  register(key, area, state);
  return state;
}
export function loadProgress(
  key: string,
  storage?: StorageArea,
): ProgressStore {
  const area = areaOrDefault(storage),
    state = readState(key, area);
  stores.set(state.data, { key, area, originals: state.originals });
  return state.data;
}
export function saveProgress(
  key: string,
  value: ProgressStore,
  storage?: StorageArea,
): ProgressWriteResult {
  const area = areaOrDefault(storage);
  if (!area) {
    warning(
      key,
      "Il salvataggio locale non è disponibile. Esporta il JSON per conservare la sessione.",
    );
    return { ok: false, blocked: true, warning: getProgressWarning(key) };
  }
  try {
    let state = states.get(area)?.get(key) ?? readState(key, area);
    if (area.getItem(key) !== state.raw) state = readState(key, area);
    if (!state.writable) {
      stores.set(value, {
        key,
        area,
        originals: normalizeOriginals(
          stores.get(value)?.originals ?? {},
          state.originals,
        ),
      });
      return { ok: false, blocked: true, warning: getProgressWarning(key) };
    }
    const data = validateProgress(value),
      raw = JSON.stringify({ version: PROGRESS_VERSION, data });
    if (
      state.migration &&
      state.raw !== null &&
      area.getItem(key + ":before-migration") === null
    )
      area.setItem(key + ":before-migration", state.raw);
    area.setItem(key, raw);
    const originals = normalizeOriginals(
      state.originals,
      stores.get(value)?.originals ?? {},
    );
    register(key, area, {
      raw,
      data,
      writable: true,
      migration: false,
      originals,
    });
    stores.set(value, { key, area, originals });
    warning(key);
    return { ok: true };
  } catch {
    warning(
      key,
      "Salvataggio non riuscito. I progressi della sessione sono disponibili nel backup JSON.",
    );
    return { ok: false, warning: getProgressWarning(key) };
  }
}
export function exportProgress(value: ProgressStore): string {
  const originals = normalizeOriginals(stores.get(value)?.originals ?? {});
  const raw = JSON.stringify(
    {
      format: FORMAT,
      version: PROGRESS_VERSION,
      data: validateProgress(value),
      originals,
    },
    null,
    2,
  );
  bounded(raw);
  return raw;
}
export function recoveryExport(
  key: string,
  value: ProgressStore,
  storage?: StorageArea,
): string {
  const associated = stores.get(value),
    area = areaOrDefault(storage ?? associated?.area);
  const stateOriginals = area
    ? (states.get(area)?.get(key)?.originals ?? {})
    : {};
  const originals = normalizeOriginals(
    associated?.originals ?? {},
    stateOriginals,
    metadataOriginals(key, area),
  );
  stores.set(value, { key, area, originals });
  return exportProgress(value);
}
export function importProgress(serialized: string): ProgressStore {
  bounded(serialized);
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw invalid();
  }
  if (!object(parsed)) throw invalid();
  const wrapped = Object.hasOwn(parsed, "version");
  if (wrapped && parsed.version !== 0 && parsed.version !== PROGRESS_VERSION)
    throw new Error(
      "Versione dei progressi non supportata. I dati attuali sono conservati.",
    );
  if (Object.hasOwn(parsed, "format") && parsed.format !== FORMAT)
    throw invalid();
  if (
    parsed.format === FORMAT &&
    (!wrapped ||
      !object(parsed.originals) ||
      !Object.values(parsed.originals).every(
        (original) => typeof original === "string",
      ))
  )
    throw invalid();
  const data = validateProgress(wrapped ? parsed.data : parsed);
  const originals =
    parsed.format === FORMAT && object(parsed.originals)
      ? normalizeOriginals(parsed.originals)
      : {};
  stores.set(data, { originals });
  return data;
}
/** Explicit confirmed import/reset only. Practice never calls this function. */
export function replaceProgress(
  key: string,
  value: ProgressStore,
  storage?: StorageArea,
): ProgressWriteResult {
  const area = areaOrDefault(storage);
  if (!area) {
    warning(
      key,
      "Il salvataggio locale non è disponibile. I dati della sessione sono conservati.",
    );
    return { ok: false, blocked: true, warning: getProgressWarning(key) };
  }
  const operations: {
      key: string;
      value: string;
      before: string | null;
      archive?: boolean;
    }[] = [],
    completed: typeof operations = [];
  const snapshots: Record<string, string> = {};
  let oldRaw: string | null | undefined;
  const metadataKey = key + ":originals";
  try {
    const data = validateProgress(value),
      raw = JSON.stringify({ version: PROGRESS_VERSION, data });
    oldRaw = area.getItem(key);
    const oldMetadata = area.getItem(metadataKey);
    if (oldRaw !== null) snapshots[key] = oldRaw;
    if (oldMetadata !== null) snapshots[ORIGINALS_WRAPPER] = oldMetadata;
    const originals = normalizeOriginals(
      states.get(area)?.get(key)?.originals ?? {},
      stores.get(value)?.originals ?? {},
      metadataOriginals(key, area),
      snapshots,
    );
    const stage = (name: string, next: string, archive = false) =>
      operations.push({
        key: name,
        value: next,
        before: area.getItem(name),
        archive,
      });
    const archivedOriginals = metadataOriginals(key, area, false);
    if (oldRaw !== null && !Object.values(archivedOriginals).includes(oldRaw)) {
      const stamp = Date.now() + "-" + replacementSequence++;
      stage(key + ":recovery:" + stamp, oldRaw, true);
      if (area.getItem(key + ":before-replace") === null)
        stage(key + ":before-replace", oldRaw, true);
    }
    stage(metadataKey, JSON.stringify(originals));
    stage(key, raw);
    for (const operation of operations) {
      area.setItem(operation.key, operation.value);
      completed.push(operation);
    }
    register(key, area, {
      raw,
      data,
      writable: true,
      migration: false,
      originals,
    });
    stores.set(value, { key, area, originals });
    warning(key);
    return { ok: true };
  } catch {
    let rollbackComplete = true;
    for (const operation of [
      ...completed.filter((entry) => entry.archive),
      ...completed.filter((entry) => !entry.archive).reverse(),
    ])
      try {
        if (operation.before === null) area.removeItem(operation.key);
        else area.setItem(operation.key, operation.before);
      } catch {
        rollbackComplete = false;
      }
    try {
      if (oldRaw !== undefined && area.getItem(key) !== oldRaw)
        rollbackComplete = false;
    } catch {
      rollbackComplete = false;
    }
    const originals = normalizeOriginals(
      stores.get(value)?.originals ?? {},
      snapshots,
    );
    stores.set(value, { key, area, originals });
    if (!rollbackComplete) {
      const state = states.get(area)?.get(key) ?? {
        raw: oldRaw ?? null,
        data: {},
        writable: false,
        migration: false,
        originals,
      };
      register(key, area, {
        ...state,
        writable: false,
        originals: normalizeOriginals(state.originals, originals),
      });
    }
    warning(
      key,
      rollbackComplete
        ? "Operazione non riuscita. I progressi locali precedenti sono conservati."
        : "Operazione interrotta. Esporta il JSON dei progressi e degli originali prima di chiudere la pagina.",
    );
    return {
      ok: false,
      rollbackComplete,
      warning: getProgressWarning(key),
      originals,
    };
  }
}
