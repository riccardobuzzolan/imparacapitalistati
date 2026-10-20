const root = document.getElementById("fiscal-feature-root");

if (root) {
  const style = document.createElement("style");
  // prettier-ignore
  style.textContent = `.fiscal-feature{max-width:1200px;margin:34px auto 64px;padding:clamp(18px,4vw,44px);background:#f8fafc;border:1px solid #e4e8ee;border-radius:26px;color:#182333;font-family:system-ui,-apple-system,Segoe UI,sans-serif;box-sizing:border-box}
.fiscal-feature *{box-sizing:border-box}.fiscal-feature-grid{display:grid;grid-template-columns:minmax(220px,.74fr) minmax(0,1.26fr);gap:clamp(18px,3vw,38px);align-items:center}
.fiscal-feature-copy small{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#53667d;font-weight:700}.fiscal-feature-copy h2{font-size:clamp(28px,3vw,44px);line-height:1.1;letter-spacing:-.04em;margin:14px 0;color:#172437}
.fiscal-feature-copy p{font-size:16px;line-height:1.65;color:#536174;margin:0 0 22px}
.fiscal-feature-copy a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none!important;border-radius:12px;background:#18283d;color:white!important;padding:13px 23px;font-size:14px;font-weight:650}
.fiscal-feature-preview{background:white;border:1px solid #dfe6ee;border-radius:18px;overflow:hidden;box-shadow:0 14px 32px rgba(24,42,65,.08);min-width:0}
.fiscal-feature-chrome{display:flex;align-items:center;gap:8px;background:#f5f7fa;border-bottom:1px solid #e5eaf0;padding:12px 16px}.fiscal-feature-dot{height:8px;width:8px;border-radius:50%;background:#cad3df}
.fiscal-feature-domain{font-size:11px;color:#677487;margin-left:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fiscal-feature iframe{display:block;width:100%;height:440px;border:0;background:#fff}
@media(max-width:760px){.fiscal-feature{margin:24px 14px 44px;padding:22px}.fiscal-feature-grid{grid-template-columns:1fr}.fiscal-feature iframe{height:450px}}`;
  root.append(style);
  // prettier-ignore
  root.insertAdjacentHTML("beforeend", `<section id="progetto-scadenze-fiscali" class="fiscal-feature" aria-labelledby="fiscal-feature-title"><div class="fiscal-feature-grid"><div class="fiscal-feature-copy"><small>Progetto web gestito da me</small><h2 id="fiscal-feature-title">Scadenze Fiscali</h2><p>Un sito dedicato alla consultazione delle scadenze fiscali italiane, con calendario e contenuti di approfondimento. Puoi esplorarlo direttamente nell'anteprima.</p><a href="https://scadenze-fiscali.vercel.app/" target="_blank" rel="noopener noreferrer">Apri sito ↗</a></div><div class="fiscal-feature-preview"><div class="fiscal-feature-chrome"><span class="fiscal-feature-dot"></span><span class="fiscal-feature-dot"></span><span class="fiscal-feature-dot"></span><span class="fiscal-feature-domain">scadenze-fiscali.vercel.app</span></div><iframe title="Anteprima interattiva del progetto Scadenze Fiscali" src="https://scadenze-fiscali.vercel.app/" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen"></iframe></div></div></section>`);
}
