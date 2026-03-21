# Current Product State

This document is the consolidation deliverable for GitHub issue `#30`.

It summarizes the major product and implementation decisions that were made through discussion and GitHub issues, and it points contributors to the current source-of-truth documents.

## What Changed Over Time

The project moved through four main stages:

1. Mock realism and source grounding
- Early work focused on making the mock feel more like a live product by grounding posts in real products and more believable fashion discussion.
- Related issues: `#1`, `#2`, `#3`, `#4`

2. Content-image alignment
- Product discussion identified that text and imagery often did not match, which broke trust.
- The team then separated:
  - alignment model definition
  - asset acquisition workflow
  - generated image policy
- Related issues: `#5`, `#6`, `#7`

3. Image/UI implementation drift
- Later implementation improved trust in some areas, but internal alignment concepts began leaking into user-facing UI.
- This created heavy, system-explanatory product modules instead of lightweight product previews.
- Related issues: `#19`, `#20`, `#25`, `#27`

4. Policy stabilization
- The repository now treats markdown policy documents as the source of truth for avoiding repeated UX drift.
- Related issues: `#29`, `#30`, `#31`

## Source-of-Truth Documents

The following documents should be treated as active policy/reference material.

### Product identity
- [`/docs/product-identity.md`](./product-identity.md)
- Purpose: defines the service identity and the top-level rule that text-led discussion stays primary

### Alignment model
- [`/docs/content-image-alignment-data-model.md`](./content-image-alignment-data-model.md)
- Purpose: defines the post-level alignment structure between text intent, products, and image evidence

### Generated image policy
- [`/docs/generated-image-policy.md`](./generated-image-policy.md)
- Purpose: defines when generated images are acceptable and how they relate to alignment needs

### Product image binding and layout rules
- [`/docs/product-image-binding-layout-rules.md`](./product-image-binding-layout-rules.md)
- Purpose: defines how named products map to product visuals and layout patterns

### User-facing product mention card policy
- [`/docs/product-mention-card-policy.md`](./product-mention-card-policy.md)
- Purpose: defines what should and should not appear in the production UI when products are mentioned in posts

### Review checklist
- [`/docs/review-checklist.md`](./review-checklist.md)
- Purpose: defines the Keep / Reduce / Remove / Defer review method and the identity review questions used after shipping

### Korean UGC outfit-shot guidance
- [`/docs/korean-ugc-outfit-shot-guidance.md`](./korean-ugc-outfit-shot-guidance.md)
- Purpose: defines how outfit-oriented imagery should stay grounded in believable Korean everyday mobile UGC instead of preview-surface polish

## Current Product Direction

The current agreed direction is:
- the app is a text-first fashion discussion product
- the app should look like a believable live Korean fashion discussion product
- text and imagery should support each other
- named products should show actual product visuals
- user-facing product cards should remain lightweight mention previews
- internal evidence/fallback/generated terminology should not appear in production UI

## What Is Historical vs Active

### Historical input
These issues matter as decision history, but should not be treated as the latest UX source by themselves:
- `#1` to `#4`
- `#19`
- `#20`
- `#25`
- `#27`

### Active implementation and policy anchors
These are the current issues/docs that contributors should reference:
- `#41` product identity and workflow institutionalization
- `#29` product mention card policy documentation
- `#30` consolidated repository summary
- `#31` apply the policy to the current UI

## Current Implementation Risks

The main risks still to watch for are:
- internal system language leaking into user-facing product UI
- outfit posts drifting toward preview-surface polish instead of mirror-style Korean UGC
- product cards becoming too large or too commerce-heavy
- metadata-only fallbacks pretending to solve a real product-visual requirement
- repeated mismatch between what posts claim and what imagery actually helps users judge

## Working Rule for Contributors

Before changing product/image UI, verify:
1. Is the product mention actually visible with a real image?
2. Is the user seeing a lightweight preview rather than a debug/evidence module?
3. Are internal fields and fallback concepts hidden from production UI?
4. Does the result still feel like a community post instead of a shopping widget?
5. Is text still the main content rather than the supporting layer?

If not, revisit the policy documents before shipping.
