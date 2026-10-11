import { describe, expect, it } from "vitest";
import {
  exportProgress,
  importProgress,
  loadProgress,
  saveProgress,
  replaceProgress,
  recoveryExport,
  getProgressWarning,
  PROGRESS_VERSION,
  MAX_BACKUP_BYTES,
  type StorageArea,
} from "./progress";

const memory = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  const storage: StorageArea = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
  return { storage, values };
};
const legacy = {
  usa: {
    AL: {
      status: "learned" as const,
      attempts: 4,
      correct: 3,
      wrong: 1,
      last: 1791450000000,
    },
  },
};

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

  it("rifiuta valori annidati e stati non validi", () => {
    expect(() => importProgress('{"usa":null}')).toThrow();
    expect(() => importProgress('{"usa":{"AL":{"status":"done"}}}')).toThrow();
  });
});

describe("validated local persistence", () => {
  it("migrates raw/v0/v1 data, retaining optional fields and the exact legacy original", () => {
    for (const payload of [
      legacy,
      { version: 0, data: legacy },
      { version: 1, data: legacy },
    ]) {
      const original = JSON.stringify(payload),
        { storage } = memory({ migrate: original });
      const store = loadProgress("migrate", storage);
      expect(store).toEqual(legacy);
      store.usa.AL.correct = 4;
      expect(saveProgress("migrate", store, storage).ok).toBe(true);
      const saved = JSON.parse(storage.getItem("migrate")!);
      expect(saved.version).toBe(PROGRESS_VERSION);
      expect(saved.data.usa.AL.correct).toBe(4);
      expect(
        Object.values(
          JSON.parse(recoveryExport("migrate", store, storage)).originals,
        ),
      ).toContain(original);
    }
    const partial = { europe: { IT: { status: "new" as const } } };
    expect(importProgress(exportProgress(partial))).toEqual(partial);
  });

  it("never overwrites corrupt, primitive, malformed or future data during practice", () => {
    for (const original of [
      "{broken",
      "null",
      "[]",
      "42",
      '{"version":1,"data":[]}',
      '{"version":99,"data":{"future":true}}',
      '{"usa":{"AL":{"correct":"3"}}}',
    ]) {
      const { storage } = memory({ guarded: original });
      const store = loadProgress("guarded", storage);
      expect(store).toEqual({});
      store.usa = { AL: { status: "learned", correct: 1 } };
      expect(saveProgress("guarded", store, storage).blocked).toBe(true);
      expect(storage.getItem("guarded")).toBe(original);
      expect(getProgressWarning("guarded")).toBeTruthy();
      expect(
        Object.values(JSON.parse(exportProgress(store)).originals),
      ).toContain(original);
    }
  });

  it("rejects unsafe counters/statuses/prototype keys but preserves safe unknown territories", () => {
    const retained = importProgress(
      '{"europe":{"ZZ99":{"status":"new","correct":1000001}},"usa":{"US-FUTURE":{"attempts":0}}}',
    );
    expect(retained.europe.ZZ99.correct).toBe(1000001);
    expect(retained.usa["US-FUTURE"].attempts).toBe(0);
    for (const entry of [
      { attempts: -1 },
      { correct: 1.5 },
      { wrong: "1" },
      { correct: Number.MAX_SAFE_INTEGER + 1 },
      { status: null },
      { status: "done" },
      { last: "yesterday" },
      { last: -1 },
    ])
      expect(() =>
        importProgress(JSON.stringify({ usa: { AL: entry } })),
      ).toThrow();
    for (const original of [
      '{"__proto__":{"polluted":true}}',
      '{"usa":{"constructor":{}}}',
      '{"usa":{"AL":{"__proto__":{"polluted":true}}}}',
      '{"usa":{"AL<script>":{}}}',
      '{"usa":null}',
    ])
      expect(() => importProgress(original)).toThrow();
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("rechecks externally changed data before a practice write", () => {
    for (const original of [
      "{new-corruption",
      '{"version":99,"data":{"future":true}}',
    ]) {
      const { storage } = memory({ external: JSON.stringify(legacy) });
      const working = loadProgress("external", storage);
      storage.setItem("external", original);
      working.usa.AL.correct = 4;
      expect(saveProgress("external", working, storage).blocked).toBe(true);
      expect(storage.getItem("external")).toBe(original);
      expect(
        Object.values(JSON.parse(exportProgress(working)).originals),
      ).toContain(original);
    }
  });

  it("handles denied storage and quota errors without throwing or changing the working session", () => {
    const denied: StorageArea = {
      getItem() {
        throw new Error("SecurityError");
      },
      setItem() {
        throw new Error("SecurityError");
      },
      removeItem() {
        throw new Error("SecurityError");
      },
    };
    const store = loadProgress("denied", denied);
    store.usa = legacy.usa;
    expect(saveProgress("denied", store, denied).ok).toBe(false);
    expect(importProgress(exportProgress(store))).toEqual(legacy);
    const { storage } = memory({ quota: JSON.stringify(legacy) });
    const working = loadProgress("quota", storage);
    storage.setItem = () => {
      throw new Error("QuotaExceeded");
    };
    expect(saveProgress("quota", working, storage).ok).toBe(false);
    expect(storage.getItem("quota")).toBe(JSON.stringify(legacy));
    expect(getProgressWarning("quota")).toMatch(/Salvataggio/);
  });

  it("explicit replacement archives corrupt originals and imported originals before replacing", () => {
    const original = "{broken",
      { storage } = memory({ replace: original });
    loadProgress("replace", storage);
    const imported = importProgress(
      JSON.stringify({
        format: "memory-atlas-progress-backup",
        version: 1,
        data: legacy,
        originals: { future: '{"version":99}' },
      }),
    );
    expect(replaceProgress("replace", imported, storage).ok).toBe(true);
    expect(JSON.parse(storage.getItem("replace")!).data).toEqual(legacy);
    expect(storage.getItem("replace:before-replace")).toBe(original);
    const originals = Object.values(
      JSON.parse(recoveryExport("replace", imported, storage)).originals,
    );
    expect(originals).toContain(original);
    expect(originals).toContain('{"version":99}');
    expect(saveProgress("replace", imported, storage).ok).toBe(true);
  });

  it("rolls back metadata and archive changes when the active-key write fails", () => {
    const initial = {
      rollback: JSON.stringify(legacy),
      "rollback:originals": '{"historic":"exact"}',
    };
    const { storage, values } = memory(initial);
    loadProgress("rollback", storage);
    const write = storage.setItem;
    storage.setItem = (key, value) => {
      if (key === "rollback" && value !== initial.rollback)
        throw new Error("QuotaExceeded");
      write(key, value);
    };
    const result = replaceProgress("rollback", {}, storage);
    expect(result.ok).toBe(false);
    expect(result.rollbackComplete).toBe(true);
    expect(Object.fromEntries(values)).toEqual(initial);
  });

  it("retains emergency original bytes and blocks practice if rollback permissions are revoked", () => {
    const original = '{"version":99,"data":{"future":true}}',
      { storage } = memory({ emergency: original });
    loadProgress("emergency", storage);
    const write = storage.setItem;
    let revoked = false;
    storage.setItem = (key, value) => {
      if (key === "emergency") revoked = true;
      if (revoked) throw new Error("SecurityError");
      write(key, value);
    };
    storage.removeItem = () => {
      if (revoked) throw new Error("SecurityError");
    };
    const store = {};
    const result = replaceProgress("emergency", store, storage);
    expect(result.rollbackComplete).toBe(false);
    expect(saveProgress("emergency", store, storage).blocked).toBe(true);
    expect(
      Object.values(
        JSON.parse(recoveryExport("emergency", store, storage)).originals,
      ),
    ).toContain(original);
  });

  it("keeps twenty backup transfers stable without losing distinct original snapshots", () => {
    const original = JSON.stringify(legacy),
      { storage } = memory({ cycles: original });
    let store = loadProgress("cycles", storage);
    const sizes: number[] = [];
    for (let index = 0; index < 20; index++) {
      const raw = recoveryExport("cycles", store, storage);
      sizes.push(new TextEncoder().encode(raw).byteLength);
      store = importProgress(raw);
      expect(Object.values(JSON.parse(raw).originals)).toContain(original);
      expect(replaceProgress("cycles", store, storage).ok).toBe(true);
    }
    expect(new Set(sizes.slice(2)).size).toBe(1);
    expect(sizes.at(-1)).toBeLessThan(10000);
  });

  it("archives distinct bytes once across repeated identical import and reset", () => {
    for (const operation of ["import", "reset"]) {
      const original = '{"version":99,"data":{"future":true}}',
        { storage, values } = memory({ dedupe: original });
      let store = loadProgress("dedupe", storage);
      const counts: number[] = [],
        bytes: number[] = [];
      for (let index = 0; index < 20; index++) {
        store =
          operation === "reset" ? {} : importProgress(exportProgress(store));
        expect(replaceProgress("dedupe", store, storage).ok).toBe(true);
        const archives = [...values].filter(([key]) => key !== "dedupe");
        counts.push(archives.length);
        bytes.push(
          archives.reduce(
            (sum, [key, value]) =>
              sum + new TextEncoder().encode(key + value).byteLength,
            0,
          ),
        );
        expect(
          Object.values(
            JSON.parse(recoveryExport("dedupe", store, storage)).originals,
          ),
        ).toContain(original);
      }
      expect(new Set(counts.slice(2)).size).toBe(1);
      expect(new Set(bytes.slice(2)).size).toBe(1);
      expect(
        [...values.keys()].filter((key) => key.startsWith("dedupe:recovery:")),
      ).toHaveLength(2);
    }
  });

  it("normalizes old wrapper nesting and preserves malformed wrapper bytes", () => {
    const first = '{"old":true}',
      second = '{"version":99}',
      wrapper = "memory-atlas-preserved-originals";
    const originals = {
      source: first,
      [wrapper]: JSON.stringify({
        source: second,
        duplicate: first,
        [wrapper]: "{broken",
      }),
    };
    const store = importProgress(
      JSON.stringify({
        format: "memory-atlas-progress-backup",
        version: 1,
        data: {},
        originals,
      }),
    );
    expect(
      new Set(Object.values(JSON.parse(exportProgress(store)).originals)),
    ).toEqual(new Set([first, second, "{broken"]));
  });

  it("uses a shared UTF-8 byte limit without silently truncating originals", () => {
    const exact = "😀".repeat(MAX_BACKUP_BYTES / 4);
    const raw = JSON.stringify({
      format: "memory-atlas-progress-backup",
      version: 1,
      data: {},
      originals: { future: exact },
    });
    expect(raw.length).toBeLessThan(MAX_BACKUP_BYTES);
    expect(new TextEncoder().encode(raw).byteLength).toBeGreaterThan(
      MAX_BACKUP_BYTES,
    );
    expect(() => importProgress(raw)).toThrow(/5 MB/);
    const { storage } = memory({ huge: exact });
    const store = loadProgress("huge", storage);
    expect(() => recoveryExport("huge", store, storage)).toThrow(/5 MB/);
    expect(storage.getItem("huge")).toBe(exact);
  });
});
