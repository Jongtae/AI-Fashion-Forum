# Lifestyle And Pet Expansion Meeting Handoff

## Background

AI Fashion Forum has so far operated as a fashion-centered discussion product.

Recent product direction changed the scope: the service should now evolve into a fashion-centered women's lifestyle community where pet-episode content can coexist with outfit questions, daily snapshots, and taste-sharing.

This is not a pivot into a general pet app.

It is an expansion from fashion discussion into fashion-led lifestyle sharing.

## What Triggered This Handoff

Product review concluded that the service can feel more believable and more lovable if it reflects real women's community behavior:

- outfit checks
- daily commute snapshots
- home / entryway / elevator / cafe moments
- pet interruptions and cute everyday accidents
- light empathy and shared taste

The team agreed that this direction should be implemented intentionally, not as random extra content.

## Agreed Decisions

- The product becomes a fashion-centered lifestyle community.
- Fashion remains the organizing center.
- Pets are an important emotional and realism layer, not the main category by themselves.
- Home feed should mix fashion judgment, daily outfit records, pet episodes, and short empathy posts.
- Pet content should appear as part of lifestyle moments around dressing, going out, commute, weekend routines, and home scenes.

## Product Direction

Use this sentence as the working product definition:

AI Fashion Forum is a fashion-centered women's lifestyle community where users share outfits, daily moments, pets, space, and taste in one believable feed.

## Content Mix

Recommended feed mix:

- 40% fashion judgment posts
- 25% daily outfit snapshot posts
- 20% pet-episode posts
- 15% short empathy / taste-sharing posts

## Post Formats

### 1. Style Question Card

Examples:

- Is this too much for work?
- Does this fit look awkward?
- Is this worth buying?

These remain core to the product.

### 2. Daily Outfit Snapshot

Examples:

- entryway mirror check before leaving
- elevator selfie before work
- cafe outfit after a morning meeting

These posts should feel casual, quick, and lived-in.

### 3. Pet Episode Card

These posts should keep fashion or lifestyle context primary while allowing the pet to create the emotional hook.

Examples:

- I tried to take a mirror shot but my dog blocked the doorway again
- I put the knit down for one second and my cat took over the photo
- I was checking my walk outfit and my dog stole the leash and ruined the frame

### 4. Short Empathy Post

Examples:

- Does anyone else end up uploading the ruined version because it feels more real?
- My cat always chooses the expensive knit, never the old one

These are lighter, reaction-friendly posts that soften the feed rhythm.

## Non-Goals

- Do not turn the product into a general pet-photo app.
- Do not let pet posts dominate the feed.
- Do not remove fashion judgment as the product's anchor.
- Do not make lifestyle content feel like random filler unrelated to clothing, going out, routines, or taste.

## UI And Content Rules

- Fashion should remain legible in every pet-episode post.
- Pet posts should feel like lived moments, not pet-influencer content.
- Feed rhythm should alternate heavier question posts with lighter daily and pet moments.
- Daily-life locations such as home, entryway, elevator, hallway, sidewalk, and cafe are preferred over polished backdrops.
- The feed should feel warmer and more human, but still intentional.

## AI Image Generation Guidance

Use these rules when generating images for the new direction:

- vary indoor and outdoor settings
- include realistic home and commute locations
- allow pets to enter the frame naturally rather than posing as the main subject
- preserve ordinary smartphone-photo feeling
- vary lighting conditions: daylight, weak household light, mixed fluorescent/daylight, cafe ambient light, cloudy outdoor light
- vary framing: full-body mirror, half-body mirror, couch-side shot, entryway shot, seated cafe shot, floor-level pet interruption shot

Generated images should not:

- look like pet campaigns
- make the pet more visually important than the outfit or situation
- use the same room, same pose, same lighting recipe repeatedly
- feel cleaner or more polished than the rest of the product

## Review Gates

Before approving implementation or generated assets, check:

- Does this still feel like a fashion-centered product?
- Is the pet content attached to a believable lifestyle moment?
- Does the feed mix still prioritize fashion and daily-life taste over generic cute-animal consumption?
- Do the images feel varied enough to suggest multiple users and situations?
- Would removing the pet still leave a coherent fashion/lifestyle post?

If the answer to the last question is no, the post is probably too pet-centric.

## Related GitHub Issues

- Meeting handoff issue: `#64`
- Frontend/content implementation issue: to be created from this handoff
- AI image generation issue: to be created from this handoff
- Related policy docs:
  - `docs/product-identity.md`
  - `docs/review-checklist.md`
  - `docs/korean-ugc-outfit-shot-guidance.md`
