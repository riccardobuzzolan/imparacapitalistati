import "./styles/analytics.css";

const MEASUREMENT_ID = "G-30SFB80YPY";
const CONSENT_KEY = "memory-atlas-analytics-consent-v1";
const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
type Choice = "granted" | "denied";
type Consent = { choice: Choice; expires: number };
type Gtag = (...args: unknown[]) => void;
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: Gtag;
};

export function isProductionSite(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    ((url.hostname === "riccardobuzzolan.github.io" &&
      url.pathname.startsWith("/imparacapitalistati/")) ||
      url.hostname === "imparacapitalistati.vercel.app")
  );
}

export function parseConsent(raw: string | null, now: number): Choice | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Consent;
    return value &&
      (value.choice === "granted" || value.choice === "denied") &&
      Number.isFinite(value.expires) &&
      value.expires > now &&
      value.expires <= now + MAX_AGE
      ? value.choice
      : null;
  } catch {
    return null;
  }
}

export function safePageLocation(url: URL): string {
  return url.origin + url.pathname;
}

export function safeReferrer(raw: string): string {
  try {
    const url = new URL(raw);
    return /^https?:$/.test(url.protocol) ? url.origin + "/" : "";
  } catch {
    return "";
  }
}

export function startAnalytics(): void {
  const url = new URL(location.href);
  if (!isProductionSite(url)) return;
  const win = window as AnalyticsWindow;
  let choice: Choice | null = null;
  try {
    choice = parseConsent(localStorage.getItem(CONSENT_KEY), Date.now());
  } catch {
    // If storage is unavailable, ask again rather than assuming consent.
  }
  let started = false;
  const banner = document.createElement("section");
  banner.className = "analytics-consent";
  banner.setAttribute("aria-label", "Consenso alle statistiche");
  const title = document.createElement("strong");
  title.textContent = "Statistiche facoltative";
  const text = document.createElement("p");
  text.textContent =
    "Riccardo Buzzolan usa Google Analytics per capire quali pagine e funzioni del gioco vengono usate. Solo se accetti, Google riceve dati tecnici di navigazione e interazioni e può salvare cookie per 6 mesi. Non inviamo le risposte al quiz o i tuoi progressi. Le funzioni del gioco sono disponibili anche se rifiuti. Puoi cambiare scelta da Statistiche.";
  const privacy = document.createElement("a");
  privacy.href = "https://policies.google.com/privacy?hl=it";
  privacy.target = "_blank";
  privacy.rel = "noopener noreferrer";
  privacy.textContent = "Privacy di Google";
  const actions = document.createElement("div");
  actions.className = "analytics-consent-actions";
  const reject = document.createElement("button");
  reject.type = "button";
  reject.textContent = "Rifiuta statistiche";
  const accept = document.createElement("button");
  accept.type = "button";
  accept.textContent = "Accetta statistiche";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Mantieni la scelta";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  actions.append(reject, accept, close);
  banner.append(title, text, privacy, actions, status);
  banner.hidden = choice !== null;
  close.hidden = choice === null;
  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "analytics-settings";
  settings.textContent = "Statistiche";
  settings.setAttribute("aria-expanded", String(!banner.hidden));
  settings.onclick = () => {
    banner.hidden = !banner.hidden;
    settings.setAttribute("aria-expanded", String(!banner.hidden));
    if (!banner.hidden) reject.focus();
  };
  close.onclick = () => {
    banner.hidden = true;
    settings.setAttribute("aria-expanded", "false");
    settings.focus();
  };
  document.body.append(banner, settings);

  function send(name: "page_view" | "quiz_start" | "region_select"): void {
    if (choice !== "granted" || !started) return;
    win.gtag?.("event", name, {
      send_to: MEASUREMENT_ID,
      page_location: safePageLocation(new URL(location.href)),
      page_referrer: safeReferrer(document.referrer),
      page_title: "Memory Atlas",
    });
  }

  function enable(): void {
    if (started || choice !== "granted") return;
    started = true;
    win.dataLayer = win.dataLayer || [];
    win.gtag = function (...args: unknown[]): void {
      // gtag expects an Arguments object, not a plain array.
      void args;
      // eslint-disable-next-line prefer-rest-params
      win.dataLayer?.push(arguments);
    };
    win.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    win.gtag("consent", "update", { analytics_storage: "granted" });
    win.gtag("js", new Date());
    win.gtag("config", MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: MAX_AGE / 1000,
      cookie_update: false,
      page_location: safePageLocation(new URL(location.href)),
      page_referrer: safeReferrer(document.referrer),
      page_title: "Memory Atlas",
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    script.onerror = () => {
      status.textContent =
        "Il servizio statistiche non è disponibile. Il gioco continua a funzionare.";
    };
    document.head.append(script);
    send("page_view");
  }

  function choose(next: Choice): void {
    choice = next;
    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ choice: next, expires: Date.now() + MAX_AGE }),
      );
    } catch {
      // The choice still applies to this page when persistence is blocked.
    }
    banner.hidden = true;
    close.hidden = false;
    settings.setAttribute("aria-expanded", "false");
    if (next === "granted") enable();
    else if (started) {
      Object.assign(window, { [`ga-disable-${MEASUREMENT_ID}`]: true });
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.trim().split("=")[0];
        if (!/^_ga(?:_|$)/.test(name)) continue;
        for (const domain of ["", `; Domain=${location.hostname}`]) {
          document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax; Secure`;
        }
      }
      // Unload the Google script immediately after withdrawal.
      location.reload();
    }
    settings.focus();
  }
  reject.onclick = () => choose("denied");
  accept.onclick = () => choose("granted");
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (button?.id === "quickBtn" && !button.classList.contains("active"))
        send("quiz_start");
      else if (button?.hasAttribute("data-region")) send("region_select");
    },
    true,
  );
  if (choice === "granted") enable();
}
