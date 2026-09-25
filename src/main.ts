import {
  STATES,
  EUROPE,
  SOUTH_AMERICA,
  EUROPE_MAP,
  SOUTH_MAP,
} from "./data/regions";
import { isAnswerCorrect } from "./game/scoring";
import {
  loadProgress,
  saveProgress,
  type ProgressEntry,
  type ProgressStore,
} from "./game/progress";

type AtlasItem = {
  state: string;
  capital: string;
  answers: readonly string[];
};

type RegionId = "usa" | "europe" | "south";
type Region = {
  label: string;
  kind: string;
  plural: string;
  data: Record<string, AtlasItem>;
  map: string;
};

type ResultMode = "correct" | "wrong" | "giveup";
type LearningStatus = "learned" | "review";

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento #${id} non trovato`);
  return element as T;
}

const USA_MAP = byId("mapWrap").innerHTML;
const REGIONS: Record<RegionId, Region> = {
  usa: {
    label: "USA",
    kind: "stato",
    plural: "stati",
    data: STATES,
    map: USA_MAP,
  },
  europe: {
    label: "EUROPA",
    kind: "Paese",
    plural: "Paesi",
    data: EUROPE,
    map: EUROPE_MAP,
  },
  south: {
    label: "SUD AMERICA",
    kind: "Paese",
    plural: "Paesi",
    data: SOUTH_AMERICA,
    map: SOUTH_MAP,
  },
};
const STORAGE_KEY = "memory-atlas-v22";
const $ = byId;
const mapWrap = $("mapWrap"),
  modalBg = $("modalBg"),
  quizPanel = $("quizPanel"),
  resultPanel = $("resultPanel"),
  input = $<HTMLInputElement>("answerInput");
let currentRegion: RegionId = "usa",
  current: AtlasItem | null = null,
  currentCode: string | null = null,
  quickMode = false,
  lastQuickCode: string | null = null,
  autoTimer: ReturnType<typeof setTimeout> | undefined,
  nextTimer: ReturnType<typeof setTimeout> | undefined,
  exactTimer: ReturnType<typeof setTimeout> | undefined;
let store: ProgressStore = loadStore();
function loadStore(): ProgressStore {
  return loadProgress(STORAGE_KEY);
}
function saveStore(): void {
  saveProgress(STORAGE_KEY, store);
}
function regionStore(): Record<string, ProgressEntry> {
  if (!store[currentRegion]) store[currentRegion] = {};
  return store[currentRegion];
}
function isCorrect(value: string, item: AtlasItem): boolean {
  return isAnswerCorrect(value, item.answers);
}
function region(): Region {
  return REGIONS[currentRegion];
}
function learnedCount(): number {
  return Object.values(regionStore()).filter((x) => x.status === "learned")
    .length;
}
function setView(view: "map" | "badges"): void {
  const map = view === "map";
  $("mapView").classList.toggle("active", map);
  $("badgeView").classList.toggle("active", !map);
  document
    .querySelectorAll<HTMLElement>("[data-view]")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  if (!map) renderBadges();
}
function setRegion(id: string | undefined): void {
  if (!id || !(id in REGIONS)) return;
  const regionId = id as RegionId;
  currentRegion = regionId;
  quickMode = false;
  clearTimeout(nextTimer);
  document
    .querySelectorAll<HTMLElement>("[data-region]")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.region === regionId),
    );
  mapWrap.innerHTML = region().map;
  bindMap();
  paintMap();
  updateToolbar();
  setView("map");
}
function updateToolbar(): void {
  const r = region(),
    done = learnedCount(),
    total = Object.keys(r.data).length;
  $("areaTitle").textContent = r.label;
  $("areaKind").textContent = total + " " + r.plural;
  $("progressDone").textContent = String(done);
  $("progressTotal").textContent = "/ " + total;
  $("quickBtn").classList.toggle("active", quickMode);
  $("quickBtn").textContent = quickMode ? "Ferma quiz" : "Quiz rapido";
  $("mapHint").textContent =
    "Tocca " + (r.kind === "stato" ? "uno stato" : "un Paese");
}
function bindMap(): void {
  mapWrap.querySelectorAll<HTMLElement>(".state-path").forEach((el) =>
    el.addEventListener("click", () => {
      quickMode = false;
      updateToolbar();
      openItem(el.dataset.state || el.dataset.code, el);
    }),
  );
}
function paintMap(): void {
  const rs = regionStore();
  mapWrap.querySelectorAll<HTMLElement>(".state-path").forEach((el) => {
    const c = el.dataset.state || el.dataset.code;
    if (!c) return;
    const s = rs[c]?.status;
    el.classList.remove("selected");
    el.style.setProperty(
      "fill",
      s === "learned" ? "#c8f0f2" : s === "review" ? "#ecd7d3" : "#e4e8e5",
      "important",
    );
    el.style.setProperty(
      "stroke",
      s === "learned" ? "#65cbd1" : s === "review" ? "#c88782" : "#9ba7a5",
      "important",
    );
  });
}
function clearTimers(): void {
  clearTimeout(autoTimer);
  clearTimeout(nextTimer);
  clearTimeout(exactTimer);
}
function openItem(code: string | undefined, path: Element | null = null): void {
  if (!code) return;
  const item = region().data[code];
  if (!item) return;
  current = item;
  currentCode = code;
  mapWrap
    .querySelectorAll(".state-path")
    .forEach((x) => x.classList.remove("selected"));
  const p =
    path ||
    mapWrap.querySelector(`[data-state="${code}"],[data-code="${code}"]`);
  if (p) p.classList.add("selected");
  clearTimers();
  quizPanel.style.display = "block";
  resultPanel.className = "result";
  input.value = "";
  $("modalCode").textContent =
    region().label + " · " + region().kind.toUpperCase();
  $("modalName").textContent = item.state;
  $("modeHint").textContent = quickMode
    ? "QUIZ RAPIDO · ESC PER USCIRE"
    : "INVIO PER VERIFICARE";
  modalBg.classList.add("open");
  $("mapHint").classList.add("hide");
  setTimeout(() => input.focus(), 50);
}
function closeModal({
  continueQuick = false,
}: { continueQuick?: boolean } = {}): void {
  clearTimeout(autoTimer);
  clearTimeout(exactTimer);
  modalBg.classList.remove("open");
  mapWrap
    .querySelectorAll(".state-path")
    .forEach((x) => x.classList.remove("selected"));
  $("mapHint").classList.add("hide");
  if (quickMode && continueQuick) nextTimer = setTimeout(openRandom, 260);
}
function mark(status: LearningStatus): void {
  if (!currentCode) return;
  const rs = regionStore(),
    prev = rs[currentCode] || { attempts: 0, correct: 0, wrong: 0 };
  prev.status = status;
  prev.attempts = (prev.attempts || 0) + 1;
  if (status === "learned") prev.correct = (prev.correct || 0) + 1;
  else prev.wrong = (prev.wrong || 0) + 1;
  prev.last = Date.now();
  rs[currentCode] = prev;
  saveStore();
  paintMap();
  updateToolbar();
}
function showResult(mode: ResultMode, given = ""): void {
  if (!current) return;
  const item = current;
  clearTimeout(exactTimer);
  quizPanel.style.display = "none";
  const good = mode === "correct";
  if (mode === "correct") mark("learned");
  else mark("review");
  resultPanel.className = "result show " + (good ? "good" : "bad");
  $("resultMark").textContent = good ? "✓" : "×";
  $("resultKicker").textContent = good
    ? "CORRETTO"
    : mode === "giveup"
      ? "DA MEMORIZZARE"
      : "HAI SBAGLIATO";
  $("resultTitle").textContent = good
    ? "Corretto"
    : mode === "giveup"
      ? "Questa è la risposta"
      : "Hai sbagliato";
  $("resultContext").textContent = item.state + " · capitale";
  $("givenAnswer").textContent = given || "—";
  $("correctAnswer").textContent = item.capital;
  const duration = good ? 1050 : mode === "wrong" ? 1750 : 1500;
  $("autoBar").style.setProperty("--close-time", duration / 1000 + "s");
  $("autoBar").replaceWith($("autoBar").cloneNode(true));
  autoTimer = setTimeout(() => {
    toast(
      good
        ? "✓ " + item.state + " · " + item.capital
        : "↻ " + item.state + " · " + item.capital,
      !good,
    );
    closeModal({ continueQuick: true });
  }, duration);
}
function checkAnswer(): void {
  if (!current || resultPanel.classList.contains("show")) return;
  const given = input.value.trim();
  showResult(isCorrect(given, current) ? "correct" : "wrong", given);
}
function openRandom(): void {
  const keys = Object.keys(region().data);
  let pick = keys[Math.floor(Math.random() * keys.length)];
  if (keys.length > 1 && pick === lastQuickCode)
    pick = keys[(keys.indexOf(pick) + 1) % keys.length];
  lastQuickCode = pick;
  openItem(pick);
}
function toggleQuick(): void {
  if (quickMode) {
    quickMode = false;
    clearTimeout(nextTimer);
    closeModal();
    updateToolbar();
    return;
  }
  quickMode = true;
  updateToolbar();
  setView("map");
  openRandom();
}
function toast(msg: string, bad = false): void {
  const t = $("toast");
  t.textContent = msg;
  t.style.background = bad ? "#8e514c" : "#111820";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 850);
}
function renderBadges(): void {
  const r = region(),
    rs = regionStore(),
    keys = Object.keys(r.data);
  $("badgeSummary").textContent =
    learnedCount() + " / " + keys.length + " consolidati";
  const html = keys
    .map((k) => {
      const item = r.data[k],
        s = rs[k]?.status || "new";
      return `<div class="badge-card ${s}"><small>${k}</small><strong>${item.state}</strong><span>${s === "learned" ? "✓ " + item.capital : s === "review" ? "Da rivedere" : "Nuovo"}</span></div>`;
    })
    .join("");
  $("badgeGrid").innerHTML = html;
}

document
  .querySelectorAll<HTMLElement>("[data-region]")
  .forEach((b) =>
    b.addEventListener("click", () => setRegion(b.dataset.region)),
  );
document
  .querySelectorAll<HTMLElement>("[data-view]")
  .forEach((b) =>
    b.addEventListener("click", () =>
      setView(b.dataset.view === "badges" ? "badges" : "map"),
    ),
  );
$("homeBtn").onclick = () => setView("map");
$("quickBtn").onclick = toggleQuick;
$("checkBtn").onclick = checkAnswer;
$("giveUpBtn").onclick = () => showResult("giveup", "");
$("fastNext").onclick = () => closeModal({ continueQuick: true });
$("closeModal").onclick = () => {
  quickMode = false;
  updateToolbar();
  closeModal();
};
modalBg.addEventListener("click", (e) => {
  if (e.target === modalBg) {
    quickMode = false;
    updateToolbar();
    closeModal();
  }
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    checkAnswer();
  }
});
input.addEventListener("input", () => {
  clearTimeout(exactTimer);
  if (
    current &&
    input.value.trim().length > 1 &&
    isCorrect(input.value, current)
  )
    exactTimer = setTimeout(checkAnswer, 160);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalBg.classList.contains("open")) {
    quickMode = false;
    updateToolbar();
    closeModal();
  } else if (
    (e.key === "Enter" || e.key === " ") &&
    resultPanel.classList.contains("show")
  ) {
    e.preventDefault();
    closeModal({ continueQuick: true });
  }
});
$("resetBtn").onclick = () => {
  if (confirm("Azzero tutti i progressi di Memory Atlas?")) {
    store = {};
    saveStore();
    paintMap();
    updateToolbar();
    renderBadges();
    toast("Progressi azzerati");
  }
};
setRegion("usa");
