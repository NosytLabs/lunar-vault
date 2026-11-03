#!/usr/bin/env node
/**
 * Check that the frontend's declared RTP matches the certified math.
 *
 * The README says it plainly: the math model (reel strips, paytable weights,
 * RTP) is authored and certified on the Engine, and this repository must match
 * the certified math before submission. So this repository cannot invent a
 * number -- it can only mirror one. This check makes that mirror explicit:
 *
 *   - the app config declares an RTP for the game and for each bet mode
 *   - the certified values live in a manifest that the Engine supplies
 *   - a missing manifest fails, because "we do not have the certified values"
 *     is a blocker, not a pass
 *
 * Usage:
 *   node apps/lunar-vault/scripts/check-certified-rtp.mjs
 *   node apps/lunar-vault/scripts/check-certified-rtp.mjs --self-test
 *   node apps/lunar-vault/scripts/check-certified-rtp.mjs --config <path> --manifest <path>
 *
 * Exit codes: 0 = the declared values match the certified manifest (or the
 * self-test passed), 1 = the check failed, 2 = the check could not run.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG = resolve(here, "../src/game/config.ts");
const DEFAULT_MANIFEST = resolve(here, "../src/game/certified-rtp.json");

/**
 * Pull the declared RTP values out of the game config.
 *
 * The config is a TypeScript module, so it cannot be imported without a build
 * step. Only the rtp lines are read, which is all this check needs, and a
 * regex keeps the check runnable with plain node.
 */
export function readDeclaredRtp(source) {
  // The config is tab indented. Normalising first keeps the indentation
  // arithmetic below about columns rather than about the file's style.
  const lines = source.replace(/\t/g, "    ").split("\n");
  const openers = [];
  const declared = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const indent = line.length - line.trimStart().length;
    const opener = /^\s*([A-Za-z0-9_]+):\s*\{/.exec(line);
    if (opener) openers.push({ indent, key: opener[1] });
    const rtpMatch = /^\s*rtp:\s*([0-9]*\.?[0-9]+)\s*,?\s*$/.exec(line);
    if (!rtpMatch) continue;
    const value = Number(rtpMatch[1]);
    if (!Number.isFinite(value)) continue;
    // The scope is the nearest block that contains this line: the game itself
    // for the top level, the bet mode for the ones inside betModes.
    let scope = "game";
    for (let o = openers.length - 1; o >= 0; o -= 1) {
      if (openers[o].indent < indent) {
        scope = openers[o].key;
        break;
      }
    }
    declared.push({ scope, value });
  }
  return declared;
}

/**
 * Compare the declared values with the certified manifest.
 *
 * The manifest shape is:
 *   { "certifiedAt": "<iso date>", "engine": "<engine reference>",
 *     "rtp": { "game": 0.96, "base": 0.96, "bonus": 0.967 } }
 */
export function compare(declared, manifest) {
  const problems = [];
  if (!manifest || typeof manifest !== "object" || !manifest.rtp || typeof manifest.rtp !== "object") {
    problems.push(
      "the certified manifest has no rtp table; it must come from the Engine certification",
    );
    return problems;
  }
  const scopes = new Set([...declared.map((d) => d.scope), ...Object.keys(manifest.rtp)]);
  for (const scope of scopes) {
    const declaredValue = declared.find((d) => d.scope === scope);
    const certifiedValue = manifest.rtp[scope];
    if (!declaredValue) {
      problems.push(`the manifest certifies "${scope}", which the config does not declare`);
      continue;
    }
    if (certifiedValue === undefined) {
      problems.push(`the config declares "${scope}" with no certified value`);
      continue;
    }
    if (declaredValue.value !== certifiedValue) {
      problems.push(
        `"${scope}" declares rtp ${declaredValue.value} but the certified value is ${certifiedValue}`,
      );
    }
  }
  return problems;
}

export function runCheck({ configPath = DEFAULT_CONFIG, manifestPath = DEFAULT_MANIFEST } = {}) {
  if (!existsSync(configPath)) {
    return { ok: false, code: 2, lines: [`the game config is missing at ${configPath}`] };
  }
  const declared = readDeclaredRtp(readFileSync(configPath, "utf8"));
  if (declared.length === 0) {
    return { ok: false, code: 2, lines: ["the game config declares no rtp values to check"] };
  }
  if (!existsSync(manifestPath)) {
    return {
      ok: false,
      code: 1,
      lines: [
        `no certified RTP manifest at ${manifestPath}`,
        "the Engine certification has to supply it; this repository cannot author it",
        `declared right now: ${declared.map((d) => `${d.scope}=${d.value}`).join(", ")}`,
      ],
    };
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    return {
      ok: false,
      code: 2,
      lines: [`the certified RTP manifest is not valid JSON: ${error.message}`],
    };
  }
  const problems = compare(declared, manifest);
  if (problems.length > 0) {
    return {
      ok: false,
      code: 1,
      lines: [
        "the declared RTP does not match the certified math:",
        ...problems.map((p) => `  - ${p}`),
        `declared: ${declared.map((d) => `${d.scope}=${d.value}`).join(", ")}`,
        `certified: ${Object.entries(manifest.rtp ?? {}).map(([k, v]) => `${k}=${v}`).join(", ")}`,
      ],
    };
  }
  return {
    ok: true,
    code: 0,
    lines: [
      `the declared RTP matches the certified math (${declared.map((d) => `${d.scope}=${d.value}`).join(", ")})`,
      `certified at ${manifest.certifiedAt ?? "an unrecorded date"} by ${manifest.engine ?? "an unrecorded engine"}`,
    ],
  };
}

function selfTest() {
  const source = ["export default {", "  rtp: 0.97,", "  betModes: {", "    base: {", "      rtp: 0.96,", "    },", "  },", "}"].join("\n");
  const declared = readDeclaredRtp(source);
  const failures = [];
  const expect = (condition, message) => {
    if (!condition) failures.push(message);
  };
  expect(declared.length === 2, `expected 2 declared values, got ${declared.length}`);
  expect(declared[0].scope === "game" && declared[0].value === 0.97, "the game rtp was not read");
  expect(declared[1].scope === "base" && declared[1].value === 0.96, "the mode rtp was not read");

  const missing = compare(declared, undefined);
  expect(missing.length === 1, "a missing manifest must report a problem");

  const drifted = compare(declared, { rtp: { game: 0.96, base: 0.96 } });
  expect(drifted.length === 1, `expected one drift, got ${drifted.length}`);
  expect(drifted[0].includes("game"), "the drift must name the game scope");

  const matched = compare(declared, { rtp: { game: 0.97, base: 0.96 } });
  expect(matched.length === 0, `expected no problems, got ${matched.length}`);

  const extra = compare(declared, { rtp: { game: 0.97, base: 0.96, bonus: 0.967 } });
  expect(extra.length === 1 && extra[0].includes("bonus"), "an uncertified scope must be reported");

  if (failures.length > 0) {
    for (const failure of failures) console.error(`self-test failed: ${failure}`);
    return 1;
  }
  console.log("self-test passed");
  return 0;
}

const argv = process.argv.slice(2);
if (argv.includes("--self-test")) {
  process.exit(selfTest());
}

const argOf = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : undefined;
};

const result = runCheck({ configPath: argOf("--config"), manifestPath: argOf("--manifest") });
for (const line of result.lines) console.log(line);
process.exit(result.code);
