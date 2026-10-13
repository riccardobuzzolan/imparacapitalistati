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
  let mediaChoice: boolean | null = null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    choice = parseConsent(raw, Date.now());
    const saved = raw
      ? (JSON.parse(raw) as Consent & { media?: boolean })
      : null;
    if (choice !== null && typeof saved?.media === "boolean")
      mediaChoice = saved.media;
  } catch {
    // If storage is unavailable, ask again rather than assuming consent.
  }
  let started = false;
  const banner = document.createElement("section");
  banner.className = "analytics-consent";
  banner.setAttribute("aria-label", "Preferenze privacy e cookie");
  const title = document.createElement("strong");
  title.textContent = "La tua privacy, le tue scelte.";
  const text = document.createElement("p");
  text.textContent =
    "Puoi consentire le statistiche Google Analytics e l’anteprima esterna Memory Atlas. Dopo l’accettazione, i servizi selezionati si caricano automaticamente. Puoi rifiutare senza perdere le funzioni del gioco; risposte e progressi restano nel browser.";
  const privacy = document.createElement("a");
  privacy.href = "./privacy.html";
  privacy.textContent = "Privacy e cookie";
  const actions = document.createElement("div");
  actions.className = "analytics-consent-actions";
  const reject = document.createElement("button");
  reject.type = "button";
  reject.textContent = "Rifiuta";
  const accept = document.createElement("button");
  accept.type = "button";
  accept.textContent = "Accetta tutti";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.className = "analytics-close";
  close.setAttribute("aria-label", "Continua senza modificare le preferenze");
  const customize = document.createElement("button");
  customize.type = "button";
  customize.textContent = "Personalizza";
  customize.setAttribute("aria-expanded", "false");
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Salva preferenze";
  save.className = "analytics-accept";
  save.hidden = true;
  accept.className = "analytics-accept";
  const choices = document.createElement("div");
  choices.className = "analytics-options";
  choices.hidden = true;
  const analyticsOption = document.createElement("label");
  const analyticsCheckbox = document.createElement("input");
  analyticsCheckbox.type = "checkbox";
  analyticsCheckbox.checked = choice === "granted";
  analyticsOption.append(
    analyticsCheckbox,
    document.createTextNode(" Statistiche Google Analytics"),
  );
  const mediaOption = document.createElement("label");
  const mediaCheckbox = document.createElement("input");
  mediaCheckbox.type = "checkbox";
  mediaCheckbox.checked = mediaChoice === true;
  mediaOption.append(
    mediaCheckbox,
    document.createTextNode(" Anteprima interattiva esterna"),
  );
  choices.append(analyticsOption, mediaOption);
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  actions.append(reject, customize, accept, save);
  banner.append(close, title, text, privacy, choices, actions, status);
  banner.hidden = choice !== null && mediaChoice !== null;
  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "analytics-settings";
  settings.textContent = "Preferenze privacy";
  settings.setAttribute("aria-expanded", String(!banner.hidden));
  settings.onclick = () => {
    banner.hidden = !banner.hidden;
    settings.setAttribute("aria-expanded", String(!banner.hidden));
    if (!banner.hidden) {
      analyticsCheckbox.checked = choice === "granted";
      mediaCheckbox.checked = mediaChoice === true;
      reject.focus();
    }
  };
  close.onclick = () => {
    if (choice === null || mediaChoice === null) {
      choose("denied", false);
      return;
    }
    banner.hidden = true;
    settings.setAttribute("aria-expanded", "false");
    settings.focus();
  };
  customize.onclick = () => {
    choices.hidden = !choices.hidden;
    customize.setAttribute("aria-expanded", String(!choices.hidden));
    save.hidden = choices.hidden;
    accept.hidden = !choices.hidden;
    if (!choices.hidden) analyticsCheckbox.focus();
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

  function applyMedia(): void {
    const frame = document.querySelector<HTMLIFrameElement>(
      "iframe[data-privacy-src]",
    );
    if (!frame) return;
    let placeholder = frame.nextElementSibling as HTMLElement | null;
    if (!placeholder?.classList.contains("analytics-media-placeholder")) {
      placeholder = document.createElement("div");
      placeholder.className = "analytics-media-placeholder";
      const info = document.createElement("strong");
      info.textContent = "Anteprima disponibile dopo il consenso";
      const action = document.createElement("button");
      action.type = "button";
      action.textContent = "Gestisci preferenze";
      action.addEventListener("click", () => settings.click());
      placeholder.append(info, action);
      frame.insertAdjacentElement("afterend", placeholder);
    }
    if (mediaChoice === true) {
      if (!frame.hasAttribute("src"))
        frame.src = frame.dataset.privacySrc || "";
    } else frame.removeAttribute("src");
    frame.style.display = mediaChoice === true ? "" : "none";
    placeholder.hidden = mediaChoice === true;
  }

  function choose(next: Choice, nextMedia: boolean): void {
    choice = next;
    mediaChoice = nextMedia;
    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({
          choice: next,
          media: nextMedia,
          expires: Date.now() + MAX_AGE,
        }),
      );
    } catch {
      // The choice still applies to this page when persistence is blocked.
    }
    banner.hidden = true;
    settings.setAttribute("aria-expanded", "false");
    applyMedia();
    if (next === "granted") enable();
    else if (started) {
      win.gtag?.("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
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
  reject.onclick = () => choose("denied", false);
  accept.onclick = () => choose("granted", true);
  save.onclick = () =>
    choose(
      analyticsCheckbox.checked ? "granted" : "denied",
      mediaCheckbox.checked,
    );
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
  applyMedia();
}
