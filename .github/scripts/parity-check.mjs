// Parity check: compare an extension PR's diff against the freighter-mobile
// counterpart files and ask Claude whether the implementations stay in sync.
// Writes parity-comment.md if anything looks off; exits 0 otherwise.
//
// Env: ANTHROPIC_API_KEY, GH_TOKEN, PR_NUMBER, PR_REPO, MOBILE_PATH, PARITY_MAP, DIRECTION

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";

const {
  ANTHROPIC_API_KEY,
  GH_TOKEN,
  PR_NUMBER,
  PR_REPO,
  MOBILE_PATH,
  PARITY_MAP,
  DIRECTION = "extension-to-mobile",
} = process.env;

const MODEL = "claude-sonnet-4-6";
const MAX_COUNTERPART_BYTES = 200_000;

const sh = (cmd, args) =>
  execFileSync(cmd, args, {
    encoding: "utf8",
    env: { ...process.env, GH_TOKEN },
  });

const map = JSON.parse(await readFile(PARITY_MAP, "utf8"));

const changed = sh("gh", [
  "pr",
  "view",
  PR_NUMBER,
  "--repo",
  PR_REPO,
  "--json",
  "files",
  "-q",
  ".files[].path",
])
  .trim()
  .split("\n")
  .filter(Boolean);

const fromKey = DIRECTION === "extension-to-mobile" ? "extension" : "mobile";
const toKey = DIRECTION === "extension-to-mobile" ? "mobile" : "extension";

const hits = map.pairs.filter((p) =>
  changed.some((f) => f.startsWith(p[fromKey])),
);

if (hits.length === 0) {
  console.log("No parity-mapped paths in this PR.");
  process.exit(0);
}

async function collectFiles(root, max) {
  const out = [];
  let total = 0;
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile()) {
        const s = await stat(p);
        if (total + s.size > max) return;
        total += s.size;
        out.push({ path: p, content: await readFile(p, "utf8") });
      }
    }
  }
  await walk(root);
  return out;
}

const counterpartBlocks = [];
for (const hit of hits) {
  const root = join(MOBILE_PATH, hit[toKey]);
  const files = await collectFiles(root, MAX_COUNTERPART_BYTES);
  counterpartBlocks.push({
    topic: hit.topic,
    extPath: hit[fromKey],
    mobPath: hit[toKey],
    files,
  });
}

const diff = sh("gh", ["pr", "diff", PR_NUMBER, "--repo", PR_REPO]);

const counterpartText = counterpartBlocks
  .map(
    (b) =>
      `## Topic: ${b.topic}\nExtension area: ${b.extPath}\nMobile area: ${b.mobPath}\n\n` +
      b.files
        .map(
          (f) =>
            `### ${relative(MOBILE_PATH, f.path)}\n\`\`\`\n${f.content}\n\`\`\``,
        )
        .join("\n\n"),
  )
  .join("\n\n---\n\n");

const SYSTEM = `You review pull requests against the Freighter browser extension to ensure cross-platform parity with freighter-mobile.

You are given:
1. The diff of a pull request to the extension repo.
2. The current state of counterpart files in freighter-mobile for the same feature areas.

Your job: identify behavioral logic the extension PR adds, changes, or removes that is NOT mirrored in the mobile counterpart files. Examples:
- New validation step (e.g., resolving a federated address before accepting a contact) that is absent on mobile.
- Renamed function or changed signature on extension side that the mobile side still uses the old name/shape for.
- New error case handled on extension that mobile silently accepts.

Be precise. Quote the specific extension change and the specific mobile gap. If the mobile counterpart already mirrors the change, or the change is purely UI/styling/typing with no behavioral impact, say so and recommend no comment.

You MUST abstain ("no comment needed") if you are not confident the gap is real. False positives train reviewers to ignore the bot.

Output JSON only, no prose around it:
{ "post_comment": boolean, "summary": "one-line headline if posting", "findings": [ { "extension_change": "...", "mobile_gap": "...", "suggested_action": "..." } ] }`;

const body = {
  model: MODEL,
  max_tokens: 2000,
  system: [
    { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
  ],
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Counterpart files in freighter-mobile (read-only context):\n\n${counterpartText}`,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: `Pull request diff (extension):\n\n${diff}`,
        },
      ],
    },
  ],
};

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error("Anthropic API error:", res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
const text = data.content?.[0]?.text ?? "";
const jsonStart = text.indexOf("{");
const parsed = JSON.parse(text.slice(jsonStart));

if (!parsed.post_comment || !parsed.findings?.length) {
  console.log("Parity OK or low confidence; no comment posted.");
  process.exit(0);
}

const comment = [
  `### Parity check (extension ↔ mobile)`,
  ``,
  `_${parsed.summary}_`,
  ``,
  ...parsed.findings.flatMap((f, i) => [
    `**${i + 1}. ${f.extension_change}**`,
    `- Mobile gap: ${f.mobile_gap}`,
    `- Suggested: ${f.suggested_action}`,
    ``,
  ]),
  `---`,
  `<sub>If this is a false positive, reply \`/parity ignore\` and we'll tune the prompt.</sub>`,
].join("\n");

await writeFile("parity-comment.md", comment, "utf8");
console.log("Wrote parity-comment.md");
