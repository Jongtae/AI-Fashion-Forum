# Outfit Preview Exposure Meeting Handoff

## Background

Outfit previews were introduced as a supporting realism layer, not as the main content of the product.

Recent review found that the same outfit-preview idea appears more than once in a single post journey and is still framed with explanatory copy such as `이런 느낌`.

## What Triggered This Handoff

The product started to feel more like a preview feature than a discussion surface whenever outfit previews were repeated or verbally explained.

This makes the UI feel system-authored and lowers realism.

## Agreed Decisions

- Outfit preview should appear once per post flow where it adds the most value.
- The preview should support the post question, not introduce a second visual narrative.
- Explanatory helper copy such as `이런 느낌` should be removed.
- The reading flow should stay anchored on the post question and discussion point.

## Non-Goals

- Do not promote outfit preview into a repeated feature block.
- Do not add helper text that explains how to read the preview.
- Do not make the preview feel like a standalone feature surface.

## UI / Content Rules

- Keep only one primary outfit-preview placement within a feed-to-detail journey.
- Remove explanatory preview copy that sounds authored by the system.
- Preserve text-first hierarchy: question first, preview second.
- If keeping the preview makes the screen feel heavier than the post, reduce or remove it.

## Review Gates

- Is the preview shown only once in the user journey?
- Is explanatory helper copy gone?
- Does the post question still read before the preview?
- Does the screen feel less like a preview product and more like a discussion post?

## Related GitHub Issues

- Meeting-derived implementation issue: `#52`
- Related policy docs:
  - `docs/product-identity.md`
  - `docs/openai-outfit-preview-feasibility-poc.md`
  - `docs/review-checklist.md`
