# Fallback Panels Text-First Meeting Handoff

## Background

The shipped product became more honest about missing or withheld imagery, but some no-image states still appear as visually prominent fallback panels.

That makes the fallback mechanism louder than the post itself and weakens the text-first discussion identity.

## What Triggered This Handoff

Review discussion concluded that missing-image handling should not become a new hero surface.

The point of withholding unrelated imagery is to protect trust, not to replace the missing image with a heavy explanation block.

## Agreed Decisions

- No-image states should stay visually quiet.
- Post title, hook, and discussion context should remain primary.
- Product references may remain available, but only as lightweight support.
- Missing-image handling should feel intentional, not system-explanatory.

## Non-Goals

- Do not reintroduce unrelated imagery just to avoid empty states.
- Do not create large fallback modules that explain system decisions to the user.
- Do not let product cards become substitute hero surfaces when imagery is unavailable.

## UI / Content Rules

- Feed, search, and detail should not use large fallback panels as the main visual block.
- User-facing copy should avoid fallback/generated/system-management wording.
- The no-image experience should still read as a discussion post first.
- If imagery is intentionally withheld, the UI should become quieter rather than more explanatory.

## Review Gates

- Does the no-image state keep the post text visually primary?
- Does the screen avoid mock-like or system-explanatory fallback language?
- Does the result feel calmer than the previous fallback panel treatment?
- Do product references remain secondary rather than replacing the missing image as a new hero?

## Related GitHub Issues

- Meeting-derived implementation issue: `#50`
- Related policy docs:
  - `docs/product-identity.md`
  - `docs/product-mention-card-policy.md`
  - `docs/review-checklist.md`
