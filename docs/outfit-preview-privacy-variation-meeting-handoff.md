# Outfit Preview Privacy Variation Meeting Handoff

## Background

Approved outfit-preview assets currently overuse a single privacy trope: a black phone covering the face in nearly every image.

This repetition makes the generated set feel obviously templated and lowers realism.

## What Triggered This Handoff

Review found that privacy protection is correct in principle, but the implementation became too uniform.

Real Korean everyday UGC uses multiple privacy-preserving patterns, not one repeated composition.

## Agreed Decisions

- Face privacy should remain protected.
- Privacy treatment should vary across the approved set.
- Acceptable variation includes phone-covered face, partial crop, soft blur, angle-based concealment, mirror-frame cutoff, and partial head cutoff.
- Prompting and review should discourage the default black-phone composition from appearing everywhere.

## Non-Goals

- Do not switch to face-forward or identity-revealing imagery.
- Do not make privacy treatment itself into a visual gimmick.
- Do not keep repetitive outputs just because they are technically valid.

## UI / Content Rules

- The approved set should look like multiple believable users, not one generator habit.
- Privacy-safe variation should feel everyday and incidental.
- If a generated image looks formulaic because of repeated privacy treatment, regenerate it.
- Diversity in privacy handling should increase realism without drawing attention away from the post.

## Review Gates

- Does the approved set avoid defaulting to the same black-phone face-cover pose?
- Are multiple privacy patterns represented?
- Does each image still look like believable Korean everyday UGC?
- Is identity still safely obscured without obvious templating?

## Related GitHub Issues

- Meeting-derived implementation issue: `#53`
- Related policy docs:
  - `docs/korean-ugc-outfit-shot-guidance.md`
  - `docs/generated-image-policy.md`
  - `docs/review-checklist.md`
