# Content-Image Alignment Data Model

This document is the design deliverable for GitHub issue `#5`.

Its purpose is to define what counts as a believable AI Fashion Forum post by treating the post text, brand/product references, image evidence, and expected discussion angle as one evidence chain.

## Design goals

- Make image choice intent-driven instead of mood-driven
- Let editors reject mismatched posts before they reach the mock
- Give Data Engineering a stable record shape to formalize later
- Keep the system focused on Korean everyday fashion-community realism

## Canonical post record

Each mock post should be stored as one structured record.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `post_id` | string | yes | Stable post identifier |
| `topic_type` | enum | yes | One of the supported evidence-driven topic types |
| `text_intent` | string | yes | What the post is asking or claiming |
| `scene_context` | object | yes | Everyday situation such as commute, office, cafe, weekend outing |
| `brand_refs` | array | yes | Mentioned brands relevant to the post |
| `product_refs` | array | conditional | Concrete items, SKUs, names, or sourced product anchors |
| `price_anchor` | object or null | conditional | Price, comparison baseline, or shopping anchor for buy/value posts |
| `image_id` | string | yes | Identifier of the attached image asset |
| `image_evidence_type` | enum | yes | What type of evidence image is attached |
| `image_evidence_role` | enum | yes | What the image is meant to prove |
| `visible_evidence_note` | string | yes | Plain-language note describing what viewers can actually judge |
| `wear_state` | enum | yes | `product_only`, `tried_on`, `worn`, `used`, `worn_with_wear_signs` |
| `expected_comment_angle` | array | yes | Likely debate vectors the comments should focus on |
| `confidence_level` | enum | yes | `high`, `medium`, or `low` confidence in evidence fit |
| `validation_status` | enum | yes | `draft`, `review_required`, `approved`, `rejected` |
| `image_match_score` | integer | yes | Internal 1-5 fit score for whether the image supports the main claim |
| `validation_notes` | array | yes | Reasons for approval or rejection |

## Supported topic types

| Topic type | What the audience judges | Required evidence | Expected comment angles |
| --- | --- | --- | --- |
| `outfit_check` | overall balance, formality, proportion, styling coherence | at least one full-look image that shows silhouette and context | proportion feedback, commute formality, shoe and outerwear coordination |
| `buy_decision` | whether the item is worth buying at the stated price/value level | real product anchor plus image showing shape, scale, or styling context | price-to-value judgment, brand premium debate, alternative item suggestions |
| `size_help` | fit, length, body proportion, size choice risk | image must expose the relevant garment/body relationship clearly | size up/down recommendations, hemming advice, body-balance feedback |
| `real_wear_review` | satisfaction after actual use, wear, maintenance, practicality | image must show real use context, wear state, or evidence of lived ownership | durability reactions, care tips, expectation-versus-reality comparisons |
| `awkward_fit_check` | specific mismatch such as bulky upper body, awkward hem, wrong inner tone | image must make the exact mismatch visibly judgeable | root-cause diagnosis, styling correction ideas, keep-or-return opinions |

## Image evidence taxonomy

| Evidence type | What it can prove | What it cannot prove | Valid topic types | Should not be used for |
| --- | --- | --- | --- | --- |
| `mirror_selfie` | full-body proportion, hem length, silhouette, commute realism | fabric durability, storage capacity, long-term wear | `outfit_check`, `size_help`, `awkward_fit_check` | `real_wear_review` claims about pilling, `buy_decision` claims that depend on material quality or bag practicality alone |
| `product_photo` | item shape, hardware, colorway, construction cues | real-life fit, daily practicality, comfort | `buy_decision` | `size_help`, `awkward_fit_check`, or commute-formality questions that require a worn silhouette |
| `detail_shot` | texture, drape, stitching, wear signs, material surface | whole-look proportion or commute mood | `buy_decision`, `real_wear_review` | `outfit_check` or any length/proportion judgment that needs the full body |
| `fit_comparison` | size delta, length delta, before/after proportion judgment | durable ownership claims | `size_help`, `awkward_fit_check` | price-value debates without a product anchor or maintenance reviews without wear evidence |
| `review_snapshot` | real use context, styling after wear, practical ownership evidence | exact product dimensions unless visible | `real_wear_review`, `buy_decision` | pure size-comparison posts or formal proportion checks that need a clean full-length view |

## Evidence-role taxonomy

The `image_evidence_role` field should come from a smaller internal set:

- `full_body_proportion_check`
- `commute_outfit_balance_check`
- `product_shape_reference`
- `texture_and_drape_reference`
- `wear_and_texture_review`
- `bag_capacity_demonstration`
- `fit_delta_comparison`
- `styling_mood_reference`

The role is more specific than the image type.
For example, two `mirror_selfie` images can have different roles if one is proving hem length and the other is proving commute formality.

## Validation rules

These rules are the minimum rejection criteria.

1. A `size_help` or `awkward_fit_check` post fails if the image does not make the claimed fit problem visible.
2. A `buy_decision` post fails if there is no concrete `product_refs` entry or `price_anchor`.
3. A `real_wear_review` post fails if the image looks like untouched editorial content with no ownership or use evidence.
4. A bag-practicality claim fails if the image only shows styling mood and does not expose carry/use context.
5. If a post names a brand or item, the named object must appear in `brand_refs` or `product_refs`.
6. If the image supports a secondary point but not the main claim, `validation_status` must be `rejected`.
7. `image_match_score` lower than `3` cannot be approved.
8. `confidence_level` cannot be `high` unless both the text claim and visible evidence note point to the same judgment target.

## Editorial creation workflow

1. Define `topic_type` and `text_intent`.
2. Fill `scene_context` with the real-life Korean usage setting.
3. Attach `brand_refs`, `product_refs`, and `price_anchor` where relevant.
4. Choose the `image_evidence_type` and `image_evidence_role` based on what must be proven.
5. Reject candidate images until one can satisfy the visible evidence note.
6. Score the post with `image_match_score`, `confidence_level`, and `validation_notes`.
7. Write body copy and expected comments only after the post is `approved`.

## Korea-specific realism guidance

The model should prioritize common Korean fashion-community scenes:

- office commute outfit checks
- semi-formal brand comparison posts
- pants hem and shoe balance questions
- size 고민 around 29CM and Musinsa purchase decisions
- knit wear/maintenance disappointment
- daily-use bag practicality
- Seongsu or cafe plans where dressiness level matters

The realism standard is everyday Korean mobile UGC, not editorial beauty.

## Approval checklist

Approve only if all of the following are true:

- the post intent is explicit
- the image can prove the main debate point
- the evidence role matches the topic type
- the brand/product anchors are concrete enough for the claim
- the expected comments follow naturally from the visible evidence
- the record reads like a believable Korean daily-life fashion post

## Example records

Reference implementation examples live in `src/data/contentImageAlignmentExamples.json`.
Named-item layout implementation rules live in `docs/product-image-binding-layout-rules.md`.

Those examples are meant to be detailed enough that Data Engineering can turn this format into a stricter schema or acquisition workflow later.
The sample set should include approved records for each core topic family plus at least one rejected mismatch example so validation behavior is explicit, not implied.
