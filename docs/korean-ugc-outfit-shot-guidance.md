# Korean UGC Outfit Shot Guidance

This document is the guidance deliverable for GitHub issue `#43`.

It defines what the project should treat as believable Korean everyday outfit imagery when a post is about dressiness, fit, balance, or situation appropriateness.

## Purpose

Outfit shots in AI Fashion Forum should feel like user-attached context from a live Korean fashion community.

They should not feel like:

- a catalog image
- a campaign cut
- a generated feature surface
- a polished preview module

The image should support the question the post is asking.

## Anti-Regression Rule

Outfit-oriented imagery must not reuse legacy mock seed assets just because they are already available in the repository.

The following are policy violations for outfit posts:

- editorial or outdoor fashion shots relabeled as mirror-style community uploads
- generic mood imagery relabeled as commute, elevator, bathroom, or room-mirror evidence
- metadata that describes a Korean everyday UGC context that the image does not actually show
- `approved` alignment records that have not passed both data review and realism review

If an image cannot honestly pass as a Korean everyday outfit upload, it must be replaced, rewritten around, or rejected.

## Core Rule

When an outfit shot exists for an outfit-oriented post, it should read like everyday Korean mobile UGC.

That means the preferred image language is:

- mirror selfie
- phone-covered face
- partially cropped face
- lightly blurred face
- natural posture
- lived-in indoor locations

## Preferred image patterns

### Camera/framing

Prefer:

- full-body or half-body mirror selfies
- phone naturally covering most of the face
- slightly off-center framing
- cropped head or face when that feels more believable
- non-studio vertical mobile-photo proportions

Avoid:

- perfect centered studio symmetry
- clean catalog front/side/back sequences
- cinematic low-angle fashion-editorial shots
- campaign-like direct eye contact

### Face treatment

Prefer:

- phone-obscured face
- cropped forehead or chin
- soft blur or partial cutoff if needed

Avoid:

- polished beauty-editorial facial emphasis
- influencer-style posed face reveal that makes the image feel promotional

### Locations

Prefer:

- elevator mirrors
- apartment entryways
- bedrooms
- bathrooms
- office hall mirrors
- plain hallway corners

Avoid:

- luxury showrooms without context
- campaign-style outdoor fashion backdrops
- overly scenic or polished locations that overpower the post
- generic sunny street-fashion cuts that do not show lived-in mirror or daily-life context

### Styling realism

Prefer:

- normal weekday office looks
- commute looks
- lunch-plan looks
- outside-appointment looks
- after-work promise looks

Avoid:

- exaggerated statement styling
- editorial layering that exceeds the post’s actual concern
- visually loud compositions that replace the discussion

## Product-reference relationship

When an outfit shot exists:

- the outfit shot is the primary visual
- product references become secondary attached context
- product references should feel like user-added tags or links
- product references must not dominate the post or explain the system

## Legacy asset rule

Legacy mock image-pool assets are not trusted by default.

Before an old asset can remain in use for an outfit-oriented post, reviewers must confirm:

- the image itself matches the claimed `image_evidence_type`
- the image itself matches the claimed `scene_context`
- the image itself matches the Korean everyday UGC tone

If any of those fail, the asset is not eligible for carry-forward use even if metadata already exists.

## UI interpretation rule

The user should first read:

1. the post question
2. the attached outfit shot
3. the lightweight product references if they want more detail

This preserves the text-first discussion identity while still letting imagery help judgment.

## Approval checklist

Approve an outfit shot only if all of these are true:

- it looks like a believable Korean everyday mobile upload
- it supports the actual debate point of the post
- it does not look like a campaign or catalog image
- it does not overpower the text
- product references still read as secondary attached context

## Approval gate

Outfit imagery requires two separate approvals before it should be treated as production-ready:

1. Data validation
- Is the asset accurately labeled for `image_evidence_type`, `image_evidence_role`, and scene context?
- Is the metadata describing the image honestly?

2. Realism validation
- Would a Korean fashion-community user plausibly upload this image?
- Does it feel like lived mobile UGC instead of fashion editorial imagery?

An outfit image should not receive final approval unless it passes both gates.

## Rejection checklist

Reject an outfit shot immediately if any of these are true:

- it looks like a fashion editorial, campaign, or posed outdoor style cut
- it relies on scenery, pose, or polish more than everyday context
- it is labeled as a mirror selfie or commute check without actually showing that situation
- the image and metadata disagree about what the user is supposed to judge
- the image was inherited from a legacy mock pool and has not been revalidated

## One-line rule

Use outfit imagery that feels like a real Korean everyday mirror-style community post, then keep product references light enough that the user still experiences the screen as a discussion post rather than a preview system.
