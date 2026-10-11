import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const base = process.env.VERCEL === "1" ? "/" : "/imparacapitalistati/";
const canonical = "https://riccardobuzzolan.github.io/imparacapitalistati/";
const root = resolve("dist");
const html = readFileSync(resolve(root, "index.html"), "utf8");
assert.match(html, /<html lang="it"/);
assert.ok(
  html.includes(`href="${canonical}"`),
  "Canonical must remain the primary Pages URL",
);
for (const tag of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
  const ref = tag[0].match(/(?:src|href)="([^"]+)"/i)?.[1];
  if (!ref || /^(?:https?:|data:|#)/.test(ref)) continue;
  const assetPath = new URL(ref, `https://build.invalid${base}`).pathname;
  assert.ok(
    assetPath.startsWith(base),
    `Asset escapes deployment base: ${ref}`,
  );
  assert.ok(
    existsSync(resolve(root, decodeURIComponent(assetPath.slice(base.length)))),
    `Missing build asset: ${ref}`,
  );
}
const manifest = JSON.parse(
  readFileSync(resolve(root, "manifest.webmanifest"), "utf8"),
);
for (const key of ["id", "scope", "start_url"])
  assert.equal(manifest[key], base, `PWA ${key}`);
for (const size of [192, 512]) {
  const name = `icon-${size}.png`;
  assert.ok(
    manifest.icons.some(
      (icon) => icon.src.endsWith(name) && icon.sizes === `${size}x${size}`,
    ),
  );
  const bytes = readFileSync(resolve(root, name));
  assert.equal(bytes.readUInt32BE(16), size);
  assert.equal(bytes.readUInt32BE(20), size);
}
assert.ok(
  html.includes(`${base}registerSW.js`),
  "External CSP-compatible worker registration missing",
);
const worker = readFileSync(resolve(root, "sw.js"), "utf8");
assert.ok(
  !/NavigationRoute|createHandlerBoundToURL/.test(worker),
  "Unknown routes must not become cached home pages",
);
assert.match(readFileSync(resolve(root, "404.html"), "utf8"), /noindex/);
assert.match(
  readFileSync(resolve(root, "robots.txt"), "utf8"),
  /Sitemap: https:\/\/riccardobuzzolan\.github\.io\/imparacapitalistati\/sitemap\.xml/,
);
assert.ok(
  readFileSync(resolve(root, "sitemap.xml"), "utf8").includes(
    `<loc>${canonical}</loc>`,
  ),
);
console.log(
  `Build assets, primary SEO, PWA scope/icons/registration and true 404 checks passed (${base}).`,
);
