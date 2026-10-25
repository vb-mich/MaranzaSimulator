#!/usr/bin/env node
/**
 * gen-image.mjs — generate or edit images with OpenAI's gpt-image models.
 *
 * Zero dependencies (Node 18+). Reads OPENAI_API_KEY from the environment or
 * from a .env file at the project root.
 *
 * Generate:
 *   node tools/gen-image.mjs --prompt "a pixel-art scooter" --out assets/art/scooter.png
 *
 * Edit / reference images (uses /v1/images/edits):
 *   node tools/gen-image.mjs --prompt "same character, now wearing a cap" \
 *        --ref assets/art/hero.png --out assets/art/hero_cap.png
 *
 * Batch (JSON array of {prompt, out, size?, quality?, background?, ref?, mask?}):
 *   node tools/gen-image.mjs --batch tools/jobs.json
 *
 * Options:
 *   --prompt <text>         Prompt (required unless --batch)
 *   --out <path>            Output file (.png | .jpg | .webp). Default: generated/<timestamp>.png
 *   --size <WxH|auto>       1024x1024 | 1536x1024 | 1024x1536 | auto   (default 1024x1024)
 *   --quality <q>           low | medium | high | auto                 (default medium)
 *   --background <b>        transparent | opaque | auto                (default auto; transparent forces png/webp)
 *   --model <id>            default: $OPENAI_IMAGE_MODEL or gpt-image-2
 *   --ref <path>            Reference image(s) for edit mode; repeat flag for several (max 16)
 *   --mask <path>           PNG mask (transparent = area to repaint), edit mode only
 *   --n <int>               Number of variants (1-10). >1 writes <out>_1.png, <out>_2.png, ...
 *   --style <path>          Prepend the contents of this file to the prompt (style preamble)
 *   --no-style              Do not auto-prepend tools/image-style.md
 *   --dry-run               Print the request that would be sent, do not call the API
 *   --json                  Print machine-readable result only
 *   --help
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_STYLE_FILE = path.join(__dirname, "image-style.md");

// ---------- tiny .env loader ----------
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotEnv(path.join(PROJECT_ROOT, ".env"));

// ---------- arg parsing ----------
function parseArgs(argv) {
  const args = { ref: [], noStyle: false, dryRun: false, json: false, n: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) fail(`Missing value for ${a}`);
      return argv[++i];
    };
    switch (a) {
      case "--prompt": args.prompt = next(); break;
      case "--out": args.out = next(); break;
      case "--size": args.size = next(); break;
      case "--quality": args.quality = next(); break;
      case "--background": args.background = next(); break;
      case "--model": args.model = next(); break;
      case "--ref": args.ref.push(next()); break;
      case "--mask": args.mask = next(); break;
      case "--n": args.n = parseInt(next(), 10); break;
      case "--style": args.style = next(); break;
      case "--batch": args.batch = next(); break;
      case "--no-style": args.noStyle = true; break;
      case "--dry-run": args.dryRun = true; break;
      case "--json": args.json = true; break;
      case "--help": case "-h": printHelp(); process.exit(0);
      default: fail(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function printHelp() {
  const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const m = src.match(/\/\*\*([\s\S]*?)\*\//);
  console.log(m ? m[1].replace(/^ \* ?/gm, "") : "see source");
}

function fail(msg, code = 1) {
  console.error(`gen-image: ${msg}`);
  process.exit(code);
}

// ---------- helpers ----------
const VALID_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536", "auto"]);
const VALID_QUALITY = new Set(["low", "medium", "high", "auto"]);
const VALID_BG = new Set(["transparent", "opaque", "auto"]);

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return ext === ".png" ? "image/png"
    : ext === ".webp" ? "image/webp"
    : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
    : "application/octet-stream";
}

function outputFormatFor(file, background) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    if (background === "transparent") fail("transparent background requires .png or .webp output");
    return "jpeg";
  }
  if (ext === ".webp") return "webp";
  return "png";
}

function resolveStylePreamble(job, args) {
  if (args.noStyle || job.noStyle) return "";
  const styleFile = job.style || args.style || (fs.existsSync(DEFAULT_STYLE_FILE) ? DEFAULT_STYLE_FILE : null);
  if (!styleFile) return "";
  const p = path.resolve(PROJECT_ROOT, styleFile);
  if (!fs.existsSync(p)) fail(`style file not found: ${p}`);
  const text = fs.readFileSync(p, "utf8").trim();
  return text ? text + "\n\n" : "";
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function withSuffix(file, idx) {
  const ext = path.extname(file);
  return path.join(path.dirname(file), `${path.basename(file, ext)}_${idx}${ext}`);
}

// ---------- API call ----------
async function runJob(job, args) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = job.model || args.model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const size = job.size || args.size || "1024x1024";
  const quality = job.quality || args.quality || "medium";
  const background = job.background || args.background || "auto";
  const n = Number.isInteger(job.n) ? job.n : args.n;
  const refs = job.ref ? [].concat(job.ref) : args.ref;
  const mask = job.mask || args.mask;
  const outArg = job.out || args.out || path.join("generated", `${timestamp()}.png`);
  const outPath = path.resolve(PROJECT_ROOT, outArg);

  if (!job.prompt) fail("--prompt is required");
  if (!VALID_SIZES.has(size)) fail(`invalid --size ${size}; use ${[...VALID_SIZES].join(" | ")}`);
  if (!VALID_QUALITY.has(quality)) fail(`invalid --quality ${quality}`);
  if (!VALID_BG.has(background)) fail(`invalid --background ${background}`);
  if (!Number.isInteger(n) || n < 1 || n > 10) fail("--n must be 1..10");
  if (refs.length > 16) fail("at most 16 --ref images");
  if (mask && refs.length === 0) fail("--mask requires at least one --ref image");

  const prompt = resolveStylePreamble(job, args) + job.prompt;
  const outputFormat = outputFormatFor(outPath, background);
  const isEdit = refs.length > 0;
  const endpoint = `${baseUrl}/images/${isEdit ? "edits" : "generations"}`;

  const fields = { model, prompt, n, size, quality, background, output_format: outputFormat };

  if (args.dryRun) {
    const dump = { endpoint, fields, refs, mask: mask || null, out: outPath };
    console.log(JSON.stringify(dump, null, 2));
    return { dryRun: true, out: outPath };
  }
  if (!apiKey) fail("OPENAI_API_KEY is not set (env or .env at project root)");

  let res;
  const headers = { Authorization: `Bearer ${apiKey}` };
  if (process.env.OPENAI_ORG_ID) headers["OpenAI-Organization"] = process.env.OPENAI_ORG_ID;
  if (process.env.OPENAI_PROJECT_ID) headers["OpenAI-Project"] = process.env.OPENAI_PROJECT_ID;

  if (isEdit) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
    for (const r of refs) {
      const p = path.resolve(PROJECT_ROOT, r);
      if (!fs.existsSync(p)) fail(`reference image not found: ${p}`);
      form.append("image[]", new Blob([fs.readFileSync(p)], { type: mimeFor(p) }), path.basename(p));
    }
    if (mask) {
      const p = path.resolve(PROJECT_ROOT, mask);
      if (!fs.existsSync(p)) fail(`mask not found: ${p}`);
      form.append("mask", new Blob([fs.readFileSync(p)], { type: "image/png" }), path.basename(p));
    }
    res = await fetch(endpoint, { method: "POST", headers, body: form });
  } else {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
  }

  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok) {
    const msg = body?.error?.message || text.slice(0, 500);
    fail(`API ${res.status} ${res.statusText}: ${msg}`);
  }

  const images = body.data || [];
  if (images.length === 0) fail("API returned no images");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const written = [];
  images.forEach((img, idx) => {
    const target = images.length > 1 ? withSuffix(outPath, idx + 1) : outPath;
    if (img.b64_json) {
      fs.writeFileSync(target, Buffer.from(img.b64_json, "base64"));
    } else if (img.url) {
      // older models may return URLs
      fail(`model returned a URL instead of base64; download manually: ${img.url}`);
    }
    written.push(target);
  });

  return {
    out: written.map((p) => path.relative(PROJECT_ROOT, p)),
    model,
    size,
    quality,
    background,
    mode: isEdit ? "edit" : "generate",
    revised_prompt: images[0].revised_prompt || undefined,
    usage: body.usage || undefined,
  };
}

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv.slice(2));

  let jobs;
  if (args.batch) {
    const p = path.resolve(PROJECT_ROOT, args.batch);
    if (!fs.existsSync(p)) fail(`batch file not found: ${p}`);
    jobs = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!Array.isArray(jobs)) fail("batch file must contain a JSON array");
  } else {
    jobs = [{ prompt: args.prompt }];
  }

  const results = [];
  for (const [i, job] of jobs.entries()) {
    if (!args.json && !args.dryRun) {
      console.error(`[${i + 1}/${jobs.length}] ${job.out || args.out || "(auto)"} …`);
    }
    try {
      results.push(await runJob(job, args));
    } catch (e) {
      if (jobs.length === 1) throw e;
      console.error(`  failed: ${e.message}`);
      results.push({ error: e.message, job });
    }
  }

  if (args.dryRun) return;
  if (args.json || jobs.length > 1) {
    console.log(JSON.stringify(jobs.length > 1 ? results : results[0], null, 2));
  } else {
    const r = results[0];
    console.log(`wrote ${r.out.join(", ")}  (${r.model}, ${r.size}, ${r.quality}, ${r.mode})`);
    if (r.usage?.total_tokens) console.log(`tokens: ${r.usage.total_tokens}`);
  }
}

main().catch((e) => fail(e.message));
