---
name: generate-image
description: Generate or edit game art (sprites, portraits, icons, backgrounds, UI elements, concept art) with OpenAI's gpt-image models via tools/gen-image.mjs. Use whenever the user asks to create, draw, render, illustrate, or produce an image, picture, sprite, icon, background or asset, or to make a variant of an existing image.
---

# Generate images with OpenAI (gpt-image)

The project ships a zero-dependency Node script, `tools/gen-image.mjs`, that calls OpenAI's
image API and writes the result to disk. Use it instead of trying to draw with SVG/canvas
whenever a real illustration is wanted.

## Prerequisites (check once per session)

1. `OPENAI_API_KEY` must be set in the environment or in `.env` at the project root
   (see `.env.example`). If it is missing, tell the user — do not try to work around it.
2. Node 18+ (`node --version`).

## Quick reference

```bash
# text → image
node tools/gen-image.mjs --prompt "<prompt>" --out assets/art/<category>/<name>.png

# sprite / icon with transparent background
node tools/gen-image.mjs --prompt "<prompt>" --background transparent --out assets/art/items/<name>.png

# edit / variant of an existing image (keeps the character consistent)
node tools/gen-image.mjs --prompt "<what to change>" --ref assets/art/characters/<name>.png --out assets/art/characters/<name>_v2.png

# inpaint only the transparent region of a mask
node tools/gen-image.mjs --prompt "<prompt>" --ref in.png --mask mask.png --out out.png

# several variants to choose from
node tools/gen-image.mjs --prompt "<prompt>" --n 3 --out assets/art/concepts/<name>.png   # → <name>_1.png, _2.png, _3.png

# batch from a JSON file (see tools/jobs.example.json)
node tools/gen-image.mjs --batch tools/jobs/<batch>.json

# inspect the request without spending credits
node tools/gen-image.mjs --prompt "..." --dry-run
```

Flags: `--size 1024x1024|1536x1024|1024x1536|auto` (default 1024x1024), `--quality low|medium|high|auto`
(default medium), `--background transparent|opaque|auto`, `--model <id>` (default `gpt-image-2`,
override with `OPENAI_IMAGE_MODEL`), `--json` for machine-readable output, `--no-style` to skip
the style preamble. Run `node tools/gen-image.mjs --help` for everything.

## Workflow

1. **Decide the asset type and target path** using the conventions below. Create the folder if needed
   (the script does `mkdir -p` for you).
2. **Write the prompt** (see guidance). The contents of `tools/image-style.md` are automatically
   prepended to every prompt so assets share one look — do not repeat that text; describe only the
   subject, composition, mood, and any deviations. Pass `--no-style` only for things that are
   deliberately off-style (e.g. a photo-realistic reference, a logo exploration).
3. **Pick quality by purpose**: `low` for quick explorations and throwaway concepts, `medium` (default)
   for most in-game assets, `high` only for hero art, key visuals, marketing. Prefer `--n 2`/`3` at
   `low` quality over one `high` render when the direction is still open.
4. **Run the script**, then **look at the result** with the Read tool on the PNG. Check: subject
   correct, no stray text, silhouette readable, background actually transparent if requested.
   If it is wrong, iterate on the prompt — or, if the composition is right but a detail is off,
   use edit mode with `--ref` so the rest stays stable.
5. **Report** the written path(s) and a one-line description. Do not paste base64 or describe every
   pixel. For batches, summarise successes and list any failures with the error message.

## Prompt guidance for this game

- Say what the asset *is* and *how it will be used*: "character portrait for the dialogue box, bust,
  facing 3/4 left" beats "a guy".
- One subject per image for sprites/icons; centred; generous margin; plain or transparent background.
- Backgrounds/scenes: state time of day, camera (side view / slight top-down), and that the centre
  of the frame must stay uncluttered if UI or characters will be overlaid.
- Character consistency: generate the base once, then derive outfits/expressions with `--ref` edits
  from that file rather than re-prompting from scratch.
- Satire guardrails: caricature of stereotypes, not of real people; no real brands, logos, football
  club crests or celebrities; avoid anything that would read as ethnic or religious mockery.
- Never ask the model to render text (names, prices, UI labels) — add it in the game's UI layer.

## File and naming conventions

```
assets/art/
  characters/   <slug>.png              full-body or bust, transparent bg, 1024x1536 for portraits
  items/        <slug>.png              icons, transparent bg, 1024x1024 (downscale in build step)
  locations/    <slug>.png              scene backgrounds, 1536x1024, opaque
  ui/           <slug>.png              frames, buttons, decorative elements, transparent bg
  concepts/     <slug>_<n>.png          explorations, not shipped
generated/                              default dump when --out is omitted; treat as scratch
```

Slugs are lowercase kebab-case, Italian or English consistently with neighbouring files
(e.g. `bar-sport.png`, `motorino-tuned.png`, `maranza-base.png`). Variants get a suffix:
`_v2`, `_night`, `_angry`.

## Batch jobs

For several related assets (a set of item icons, all locations), write a JSON array to
`tools/jobs/<name>.json` — each entry: `{"prompt","out","size?","quality?","background?","ref?","mask?","n?"}` —
and run `--batch`. The script continues past individual failures and prints a JSON summary.
Keep job files in git; they double as the record of how each asset was made.

## Cost awareness

Each call bills OpenAI image tokens (roughly: low ≈ cheapest, high ≈ several times medium; larger
sizes cost more). Use `--dry-run` when unsure what will be sent, keep explorations at `low`, and
do not regenerate assets the user did not ask to change.

## Troubleshooting

- `API 401` → key missing/invalid. `API 403` / "model not found" / verification error → the OpenAI
  org may lack access to `gpt-image-2`; retry with `--model gpt-image-1.5` (or `gpt-image-1`) and
  tell the user.
- `API 400 ... moderation` → rephrase; the API blocked the prompt (often real people, brands, or
  violence). Do not try to evade it.
- Transparent background came back opaque → ensure `--background transparent` and a `.png`/`.webp`
  output; some styles ("photo", "scene") resist transparency — say "isolated on transparent
  background, no floor, no shadow" in the prompt.
- Script can't find `.env` → it looks only at the project root (`B:\GAMES\MaranzaSimulator\.env`).
