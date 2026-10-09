import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isProductionSite,
  parseConsent,
  safePageLocation,
  safeReferrer,
  startAnalytics,
} from "./analytics";

class FakeElement {
  children: FakeElement[] = [];
  tag: string;
  hidden = false;
  textContent = "";
  src = "";
  onclick?: () => void;
  constructor(tag: string) {
    this.tag = tag;
  }
  append(...elements: FakeElement[]): void {
    this.children.push(...elements);
  }
  setAttribute(): void {
    /* No-op DOM surface for consent transition tests. */
  }
  focus(): void {
    /* No-op DOM surface. */
  }
}

afterEach(() => vi.unstubAllGlobals());

function consentHarness(
  host = "https://imparacapitalistati.vercel.app/?email=private#answer",
) {
  const body = new FakeElement("body");
  const head = new FakeElement("head");
  const storage = new Map<string, string>();
  const reload = vi.fn();
  const win: { dataLayer?: Array<ArrayLike<unknown>> } = {};
  vi.stubGlobal("window", win);
  vi.stubGlobal("location", {
    href: host,
    hostname: new URL(host).hostname,
    reload,
  });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) || null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal("document", {
    body,
    head,
    referrer: "https://example.com/search?q=private",
    cookie: "",
    createElement: (tag: string) => new FakeElement(tag),
    addEventListener: vi.fn(),
  });
  return { body, head, storage, reload, win };
}

describe("Consent transitions", () => {
  it("loads no Google code before consent or after rejection", () => {
    const h = consentHarness();
    startAnalytics();
    expect(h.head.children).toHaveLength(0);
    expect(h.win.dataLayer).toBeUndefined();
    h.body.children[0].children[3].children[0].onclick?.();
    expect(h.head.children).toHaveLength(0);
    expect([...h.storage.values()][0]).toContain('"denied"');
  });
  it("loads once on approval and disables and reloads on withdrawal", () => {
    const h = consentHarness();
    startAnalytics();
    const buttons = h.body.children[0].children[3].children;
    buttons[1].onclick?.();
    buttons[1].onclick?.();
    expect(h.head.children).toHaveLength(1);
    expect(h.head.children[0].src).toContain("G-30SFB80YPY");
    const calls = h.win.dataLayer?.map((x) => Array.from(x)) || [];
    expect(calls[0]).toEqual([
      "consent",
      "default",
      {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
    ]);
    expect(
      calls.filter((x) => x[0] === "event" && x[1] === "page_view"),
    ).toHaveLength(1);
    expect(JSON.stringify(calls)).not.toContain("private");
    buttons[0].onclick?.();
    expect(h.win).toHaveProperty("ga-disable-G-30SFB80YPY", true);
    expect(h.reload).toHaveBeenCalledOnce();
    expect([...h.storage.values()][0]).toContain('"denied"');
  });
  it("does not create a banner or collect on preview or unrelated sites", () => {
    const h = consentHarness("https://riccardobuzzolan.github.io/");
    startAnalytics();
    expect(h.body.children).toHaveLength(0);
    expect(h.head.children).toHaveLength(0);
  });
});

describe("Analytics privacy boundaries", () => {
  it("limits collection to the two production copies of this game", () => {
    expect(
      isProductionSite(new URL("https://imparacapitalistati.vercel.app/")),
    ).toBe(true);
    expect(
      isProductionSite(
        new URL("https://riccardobuzzolan.github.io/imparacapitalistati/"),
      ),
    ).toBe(true);
    for (const url of [
      "https://riccardobuzzolan.github.io/",
      "https://riccardobuzzolan.github.io/imparacapitalistati-other/",
      "https://usa-memory-atlas.vercel.app/",
      "https://imparacapitalistati-preview.vercel.app/",
      "http://localhost:5173/",
    ]) {
      expect(isProductionSite(new URL(url))).toBe(false);
    }
  });
  it("does not assume consent when absent, malformed, expired or unsupported", () => {
    for (const raw of [
      null,
      "{",
      "null",
      "{}",
      '{"choice":"granted","expires":50}',
      '{"choice":"yes","expires":200}',
      '{"choice":"granted","expires":"200"}',
    ]) {
      expect(parseConsent(raw, 100)).toBe(null);
    }
    expect(parseConsent('{"choice":"granted","expires":200}', 100)).toBe(
      "granted",
    );
    expect(parseConsent('{"choice":"denied","expires":200}', 100)).toBe(
      "denied",
    );
  });
  it("excludes query strings and fragments from page locations and referrer paths", () => {
    expect(
      safePageLocation(
        new URL(
          "https://imparacapitalistati.vercel.app/?email=test%40example.com#answer",
        ),
      ),
    ).toBe("https://imparacapitalistati.vercel.app/");
    expect(
      safeReferrer("https://example.com/private/path?token=test#fragment"),
    ).toBe("https://example.com/");
    expect(safeReferrer("javascript:alert(1)")).toBe("");
    expect(safeReferrer("")).toBe("");
  });
});
