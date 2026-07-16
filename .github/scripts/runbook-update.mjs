// For a merged commit, find runbooks (in wallet-eng-runbooks) whose `watches:`
// frontmatter matches changed files, ask Claude to propose edits, and write
// updated runbook files in place. The workflow then opens a PR.
//
// Env: ANTHROPIC_API_KEY, GH_TOKEN, RUNBOOKS_PATH, SOURCE_REPO, COMMIT_SHA

import { readFile, writeFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";

const { ANTHROPIC_API_KEY, GH_TOKEN, RUNBOOKS_PATH, SOURCE_REPO, COMMIT_SHA } =
  process.env;

const MODEL = "claude-sonnet-4-6";

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, {
    encoding: "utf8",
    env: { ...process.env, GH_TOKEN },
    ...opts,
  });

const changed = sh("git", [
  "diff",
  "--name-only",
  `${COMMIT_SHA}~1`,
  COMMIT_SHA,
])
  .trim()
  .split("\n")
  .filter(Boolean);
const diff = sh("git", ["diff", `${COMMIT_SHA}~1`, COMMIT_SHA]);

async function listMarkdown(dir) {
  const out = [];
  async function walk(d) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(p);
    }
  }
  await walk(dir);
  return out;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  let key = null;
  for (const line of m[1].split("\n")) {
    if (/^\s*-\s+/.test(line) && key) {
      meta[key] = meta[key] || [];
      meta[key].push(line.replace(/^\s*-\s+/, "").trim());
    } else {
      const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (kv) {
        key = kv[1];
        meta[key] = kv[2].trim() || [];
      }
    }
  }
  return { meta, body: m[2] };
}

function watchMatches(watches, changed) {
  if (!Array.isArray(watches)) return false;
  return watches.some((pat) => {
    const prefix = pat.replace(/\*\*$/, "").replace(/\*$/, "");
    return changed.some((f) => f.startsWith(prefix));
  });
}

const runbookFiles = await listMarkdown(RUNBOOKS_PATH);
const affected = [];
for (const f of runbookFiles) {
  const text = await readFile(f, "utf8");
  const { meta, body } = parseFrontmatter(text);
  if (watchMatches(meta.watches, changed)) {
    affected.push({ path: f, original: text, meta, body });
  }
}

if (affected.length === 0) {
  console.log("No runbooks watch the changed paths.");
  process.exit(0);
}

const SYSTEM = `You maintain on-call runbooks for the Stellar wallet engineering team.

You are given:
1. A code commit (diff) that just landed in a service or app repo.
2. One or more runbook markdown files whose frontmatter \`watches:\` field includes paths touched by this commit.

Your job: for each runbook, propose minimal, faithful edits that keep the runbook accurate. Examples of edits worth making:
- A command, file path, env var, or function name in the runbook was renamed in the diff.
- The runbook describes a behavior that was added/removed/changed by the diff.
- A step is now incorrect because the underlying mechanism changed.

DO NOT:
- Rewrite for style.
- Add speculative content not grounded in the diff.
- Remove sections that the diff doesn't affect.
- Update timestamps or "last reviewed" fields.

If a runbook is unaffected after careful inspection, leave it alone.

Output JSON only:
{
  "updates": [
    { "path": "<path of the runbook>", "new_content": "<full updated markdown including frontmatter>", "reason": "one short sentence" }
  ]
}
If no runbook needs editing, return { "updates": [] }.`;

const userParts = [
  {
    type: "text",
    text: `Source repo: ${SOURCE_REPO}\nCommit: ${COMMIT_SHA}\n\nDiff:\n\n${diff}`,
  },
  ...affected.map((a) => ({
    type: "text",
    text: `Runbook: ${relative(RUNBOOKS_PATH, a.path)}\n\n${a.original}`,
  })),
];

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 4000,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userParts }],
  }),
});

if (!res.ok) {
  console.error("Anthropic API error:", res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
const text = data.content?.[0]?.text ?? "";
const parsed = JSON.parse(text.slice(text.indexOf("{")));

if (!parsed.updates?.length) {
  console.log("No runbook edits proposed.");
  process.exit(0);
}

const reasons = [];
for (const u of parsed.updates) {
  const target = join(RUNBOOKS_PATH, u.path.replace(/^\.runbooks\//, ""));
  await writeFile(target, u.new_content, "utf8");
  reasons.push(`- \`${u.path}\` — ${u.reason}`);
}

const body = [
  `Automated runbook update triggered by [${SOURCE_REPO}@${COMMIT_SHA.slice(0, 8)}](https://github.com/${SOURCE_REPO}/commit/${COMMIT_SHA}).`,
  ``,
  `### Proposed edits`,
  ...reasons,
  ``,
  `<sub>Review carefully — bot suggestions can be wrong. Close this PR if the edits aren't right.</sub>`,
].join("\n");

await writeFile("runbook-pr-body.md", body, "utf8");
console.log(`Wrote ${parsed.updates.length} runbook update(s) and PR body.`);
