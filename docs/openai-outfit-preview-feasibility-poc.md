# OpenAI Outfit Preview Feasibility PoC

This document is the implementation deliverable for GitHub issue `#39`.

It defines the constrained PoC path for testing whether a single OpenAI GPT Image outfit preview can improve post realism when paired with existing product mention cards.

## Current PoC posture

- Vendor path: OpenAI GPT Image only
- UI scope: detail-first only
- Product card policy: preserved
- Generated image policy: fallback-governed
- Current workspace run status: credentialed generation completed and manual review completed

This branch now includes the full constrained PoC loop:

- candidate set selection
- prompt and reference-image assembly
- OpenAI Responses API generation run
- manual pass/fail review
- UI attachment only for approved previews

## Why the implementation is detail-first

Issue `#39` explicitly says the outfit preview is a supporting realism layer and should not replace the product mention card system.

That means:

- feed remains product-card-first
- outfit preview is attached only if approved
- detail view is the safest first surface because it supports a richer visual without overpowering the reading flow

## Official OpenAI choices behind this PoC

The current OpenAI documentation supports image generation through:

- GPT Image models that accept text and image input and produce image output
- the Responses API image generation tool

For this PoC, the branch uses the Responses API path because it allows:

- one text prompt that captures post context
- 1 to 3 reference images in the same request
- one generated outfit preview result
- access to the revised prompt for review logging

The branch defaults the generation request to:

- `model: gpt-5`
- `tool_choice: image_generation`
- output `size: 1024x1536`
- output `quality: low`
- output `background: auto`

The low setting follows the issue’s cost-control guidance for a first pass.

## Credentialed run summary

Execution date:

- 2026-03-21

Run outcome:

- 12 candidate posts processed
- 12 preview images generated
- 10 previews approved for detail-view attachment
- 2 previews rejected after manual review

Observed data-source caveat:

- `T04` completed with partial reference coverage because one product image source returned `403 Forbidden`
- the run continued because the script now records failed reference fetches per post instead of aborting the entire batch

Generated files live in:

- [`/public/openai-outfit-preview-poc`](../public/openai-outfit-preview-poc)

## Candidate set

The active candidate set lives in:

- [`/src/data/openaiOutfitPreviewManifest.json`](../src/data/openaiOutfitPreviewManifest.json)

Selection rules:

- only posts where an outfit/styling preview could plausibly improve realism
- avoid `real_wear_review` cases that would overclaim lived ownership
- prefer posts with usable referenced-product imagery already resolved
- prefer office/commute/appointment situations where a single preview image is easy to judge

Current candidate count:

- 12 posts

## Prompt/input assembly

Each selected post assembles a prompt from four layers:

1. Product layer
- referenced products and categories
- color and silhouette hints from the resolved product set

2. Scene layer
- weekday office
- commute
- outside appointment
- after-work promise

3. Concern layer
- too formal
- too sharp
- upper body too bulky
- lower half too heavy
- proportion imbalance

4. Tone layer
- believable Korean community-post mood
- natural social photo
- not glossy
- not editorial
- not official product imagery

Negative constraints:

- no campaign polish
- no fashion magazine lighting
- no exaggerated pose
- no text overlays
- no collage output

## Review and approval rule

This branch keeps approval strict.

Only entries with:

- `ui_attachment.approved = true`
- a valid `assetPath`

may render in the user-facing UI.

If a generation run is weak, the UI stays exactly where it already is now:

- product mention cards remain visible
- no failure explanation is shown to end users
- no generated-image terminology is shown in user-facing UI

## Manual review sheet

Approved for UI attachment:

- `T01`: believable elevator mirror realism and readable trouser-break cue
- `T03`: believable busy-morning social-photo tone with useful accessory balancing
- `T04`: strong office mirror realism despite partial reference coverage
- `T05`: clear lower-half balance check in a believable hallway mirror context
- `T06`: believable office-to-lunch styling without editorial polish
- `T07`: after-work styling reads plausibly and keeps the jacket as the main layer
- `T11`: fitting-room mirror context supports the purchase-evaluation use case
- `T14`: shirt-volume and upper-body balance are easy to judge
- `T15`: trouser-width and shoe-break comparison stays legible
- `T16`: commute-street framing feels believable and visually useful

Rejected after manual review:

- `T02`: too polished and campaign-like for the intended community-post realism target
- `T13`: weak product association and weak fit with the intended Korean daily-fashion size-help scenario

## Output artifacts in this branch

- candidate and review manifest:
  - [`/src/data/openaiOutfitPreviewManifest.json`](../src/data/openaiOutfitPreviewManifest.json)
- execution script:
  - [`/scripts/run-openai-outfit-preview-poc.mjs`](../scripts/run-openai-outfit-preview-poc.mjs)
- detail-view attachment slot:
  - [`/FashionThreadPage.jsx`](../FashionThreadPage.jsx)

## Run commands

Dry run:

```bash
npm run poc:outfit-preview:dry-run
```

Credentialed run:

```bash
OPENAI_API_KEY=... npm run poc:outfit-preview
```

Optional overrides:

- `OPENAI_OUTFIT_PREVIEW_MODEL`
- `OPENAI_OUTFIT_PREVIEW_SIZE`
- `OPENAI_OUTFIT_PREVIEW_QUALITY`
- `OPENAI_OUTFIT_PREVIEW_BACKGROUND`

## Current recommendation

Current recommendation: `continue detail-view only with approved subset`

Reason:

- the credentialed run produced enough believable outputs to justify a constrained continuation
- the strict approval gate prevented weaker outputs from reaching the UI
- the existing product mention card policy remains intact
- detail-view-only placement remains the safest first attachment surface
- data-source hardening is still needed for blocked product-image hosts before any broader scale-out
