# Real-Photo-Preferred Pet Lifestyle Strategy

This document is the strategy deliverable for GitHub issue `#69`.

It defines how pet-episode and lifestyle imagery should be sourced now that the product direction prefers real photography over generated imagery for this slice.

## Policy Summary

For pet-episode and pet-adjacent lifestyle posts:

- real-source photography is preferred
- generated imagery is fallback-only
- fashion and daily-life context must remain more important than the pet

This strategy sits upstream of generated fallback work such as GitHub issue `#66`.

## Real-Photo-Preferred Episode Types

The following episodes should try real-source photography first:

- mirror shot interrupted by a cat or dog
- entryway or front-door outfit check with a pet waiting nearby
- laid-out knit, shirt, or skirt scene interrupted by a pet
- walk-ready or outing-ready outfit scene with leash, bag, shoes, or carrier in frame
- home snapshot where a pet changes the tone of the fashion post without becoming the main subject

## Acceptance Rules For Real Candidates

A real-source candidate is strong enough when:

- it reads like an actual lived-in photo rather than a campaign
- the pet is part of the moment, not the hero subject
- clothing or outfit context is still legible
- the scene fits the intended episode more than it fits a generic pet-photo mood
- a Korean community user plausibly could have uploaded something similar

## Current Candidate Inventory

The repository-local candidate list lives in:

- [`/Users/jongtaelee/Documents/camel-ai-study/data/real-photo-preferred-pet-lifestyle-candidates.json`](data/real-photo-preferred-pet-lifestyle-candidates.json)

That inventory currently captures:

- episode target
- preferred target posts
- source provider
- candidate page URL
- licensing note
- fit assessment
- acquisition status

## Current Acquisition Constraint

During issue `#69` execution, candidate page URLs could be identified, but automated fetch access to Pexels page endpoints returned `403` for repository-side bot requests.

That means:

- the candidates are curated and logged
- manual browser-side download or alternate provider substitution is still required before those assets can replace generated fallback in the repository
- generated pet-episode imagery remains a temporary fallback only where no approved real asset has been packaged yet

## Fallback-Only Rule

Use AI-generated pet/lifestyle imagery only when all of the following are true:

- a real-source candidate has not yet been acquired or approved
- the post still needs visual support to remain believable
- the generated image passes realism review and does not look like a pet campaign
- the generated image is attached as fallback support, not as the default asset strategy

## Downstream Handoff

Downstream work should follow this order:

1. Check the real-photo candidate inventory for the episode type.
2. If a candidate can be legally and operationally acquired, prefer that route.
3. If acquisition is blocked or no strong candidate exists, fall back to issue `#66` style generated support imagery.
4. Replace generated pet-episode attachments once real-source assets are packaged and approved.

## Related Issues

- Real-photo-preferred strategy: `#69`
- Generated fallback execution: `#66`
- Lifestyle direction handoff: `#64`
