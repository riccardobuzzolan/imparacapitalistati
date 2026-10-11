import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const forbidden = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{50,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/,
];
for (const file of files) {
  if (
    /^\.env(?:\.|$)|(?:^|\/)(?:credentials|service-account)\.json$/i.test(file)
  )
    throw new Error(`Sensitive file path: ${file}`);
  if (!/\.(?:ts|js|mjs|html|css|json|md|ya?ml|txt|xml)$/.test(file)) continue;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const pattern of forbidden)
    if (pattern.test(text))
      throw new Error(`Credential pattern found in ${file}; value redacted`);
}
const config = JSON.parse(readFileSync("vercel.json", "utf8"));
const csp =
  config.headers
    .flatMap((rule) => rule.headers)
    .find((header) => header.key === "Content-Security-Policy")?.value || "";
assert.ok(csp.includes("script-src 'self'") && !csp.includes("'unsafe-eval'"));
assert.ok(
  !config.rewrites?.some((rule) => rule.destination === "/index.html"),
  "Catch-all rewrite would produce soft 404s",
);
console.log(
  `Source and redacted credential checks passed (${files.length} files).`,
);
