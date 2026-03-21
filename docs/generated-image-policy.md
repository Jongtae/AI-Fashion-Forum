# Generated Image Policy

This document is the policy deliverable for GitHub issue `#7`.

It defines when generated images may be used in AI Fashion Forum and how they relate to the content-image alignment model from `#5` and the repository-local asset workflow from `#6`.

## Policy position

Generated images are allowed in the mock, but only as a fallback asset source.

They are not the default choice.
They should be used only when:

- a real asset cannot be sourced in reasonable time
- the post still needs evidence-aligned imagery to remain believable
- the generated image can support the same judgment target required by the post

If a mismatched real image and a well-scoped generated image are the only options, the generated image is preferred.

If a generated image would create a false sense of lived ownership or overclaim evidence, the post should use no image, be rewritten, or be rejected instead.

## Relationship to #5 and #6

- `#5` defines the alignment schema and validation rules every post must satisfy.
- `#6` defines the operational path for sourcing and packaging approved assets.
- This policy adds the decision layer for when generated images may enter that asset pool.

Generated images do not bypass `#5`.
They must still pass the same evidence-fit and believability checks before being accepted.

## Default recommendation

The team should treat generated images as `fallback-only`.

That means:

- use real images first when they can support the claim
- use generated images only when the evidence need is clear and limited
- reject generated images for claims that depend on real ownership, wear, or real-world proof

## Pet-Episode Override

For pet-episode and pet-adjacent lifestyle posts, generated imagery is more tightly constrained.

- treat these posts as `real-photo-preferred`
- try real-source curation before approving generated fallback
- use generated imagery only when no acceptable real candidate has been acquired or approved yet
- replace generated pet-episode attachments once a believable real-source asset is packaged

The upstream sourcing strategy for this override is tracked in issue `#69`.

## Allowed vs disallowed matrix

| Topic type | Allowed? | Notes |
| --- | --- | --- |
| `outfit_check` | yes, conditional | acceptable when the question is about proportion, silhouette, or overall dressiness |
| `buy_decision` | yes, conditional | acceptable for shape, styling context, or rough visual comparison, but not as a fake substitute for official product proof |
| `size_help` | yes, narrow use | only if the generated image clearly exposes body/garment proportion and is reviewed for realism |
| `real_wear_review` | no | cannot fabricate lived ownership, pilling, durability, comfort, or disappointment evidence |
| `awkward_fit_check` | yes, conditional | acceptable if the exact awkward point is visibly judgeable and the image stays everyday-looking |

## Evidence-role compatibility

| Evidence role | Generated image allowed? | Why |
| --- | --- | --- |
| silhouette or proportion check | yes | can support visible body/garment balance if realism is high |
| fit comparison | yes, narrow use | acceptable if clearly framed as comparison evidence, not real ownership |
| styling balance | yes | generated imagery can help test whether tones, lengths, and shape balance feel believable |
| bag capacity demonstration | yes, limited | only if the image visibly shows use context and does not fake brand-official proof |
| fabric texture approximation | caution | may be used only for rough surface/mood guidance, not as proof of true hand-feel or quality |
| wear-and-tear evidence | no | must come from real photography because the claim depends on lived use |
| durability / pilling / maintenance proof | no | generated images are inherently misleading for these claims |

## Realism boundaries

Reject a generated image if any of the following are true:

- it looks like an editorial campaign instead of everyday Korean UGC
- it looks too polished, cinematic, or luxury-branded for the post tone
- it resembles an official brand image closely enough to confuse the source
- it implies a real owner experience that never happened
- it does not actually show the debate point described by the post
- it overstates texture, wear, or practicality beyond what the model can credibly show
- it clashes with the Korean daily-life context in `scene_context`

The bar is not visual beauty.
The bar is believable evidence support.

## Disclosure and tracking policy

Generated-image usage must always be tracked internally.

Minimum internal fields:

- `asset_origin: generated`
- `generation_purpose`
- `approval_owner`
- `review_notes`

For this mock, explicit user-facing disclosure is optional.
However, the team must be able to distinguish generated assets during review and replacement planning.

## Review gate

A generated image can only be accepted if it passes all of the following:

1. `#5` alignment validation still passes.
2. The image supports the main debate point, not just the vibe.
3. The image looks believable for Korean mobile-first fashion community context.
4. The image does not fake real ownership, wear, or product-official proof.
5. The post can still be honestly described without implying a real event that did not occur.
6. A reviewer explicitly signs off that the generated image is better than the available mismatched real-image options.

## Fallback decision tree

1. Start with post intent and evidence need from `#5`.
2. Try to source a real image through the workflow in `#6`.
3. If a real image exists and supports the claim, use it.
4. If only mismatched real images exist, ask whether the claim can be rewritten to fit real evidence.
5. If rewrite is not enough, evaluate whether a generated image could support the exact judgment target.
6. If the claim depends on lived ownership, wear, durability, or maintenance, reject generated-image use.
7. If the claim is about silhouette, styling balance, or narrow fit comparison and realism can be controlled, generated-image fallback may be approved.
8. Run the review gate.
9. If the review gate fails, do not publish the image-backed post.

## Examples

Good fallback use:

- commute outfit proportion question where a realistic mirror-style generated image clearly shows hem length and formality
- awkward layering question where the generated image makes the bulky shoulder line visibly judgeable
- size comparison mock showing clear small/medium fit delta without pretending it came from a real owner

Bad fallback use:

- “this knit pills after three wears” review
- “this bag is inconvenient in real commute use” without real carry evidence
- “this product photo proves the official color and finish” when the image is generated

## Final recommendation

Generated images should remain a tightly reviewed fallback tool.

They are useful only when they improve evidence alignment more than a generic or mismatched real image would.
They should never become the default visual source for the mock.
