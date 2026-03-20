# Product Mention Card Policy

This document is the policy deliverable for GitHub issue `#29`.

It defines how user-facing product mention cards should behave in AI Fashion Forum so the UI stays lightweight, readable, and community-native instead of drifting into debug, QA, or commerce-heavy presentation.

## Purpose

Product cards in AI Fashion Forum exist to help users quickly recognize products mentioned in a post.

They are not:
- evidence system panels
- debug surfaces
- fallback explanation widgets
- full shopping modules

The intended user experience is simple:
- the user sees the actual referenced product image
- the user identifies the product name quickly
- the user can click through if they want more detail

## Core Rule

If a post explicitly mentions a product, the user-facing UI should show that product as a lightweight mention preview.

The production UI should not expose internal reasoning about:
- evidence
- fallback
- generated vs real
- ranking
- confidence
- matching logic

## User-Facing Goals

Product mention UI should help the user:
- understand what product is being referenced
- stay in the reading flow of the post
- explore the source naturally if they choose

Product mention UI should not:
- demand more attention than the post body
- feel like an ad unit
- feel like a product recommendation engine
- explain the implementation system behind the card

## What Users Should See

Keep the visible information minimal.

Primary:
- product image
- product name

Secondary:
- optional brand name
- optional price

Interaction:
- card click or product-name click

## What Users Should Not See

The following must not appear in production UI:
- `evidence`
- `representative evidence`
- `supporting evidence`
- `image evidence role`
- `generated thumbnail`
- `real + generated`
- `fallback` wording
- ranking or score labels
- confidence-like labels
- debug or internal asset notes

## Presentation Model

Treat product cards as `mention previews`, not `shopping cards`.

This means:
- lighter visual weight
- reduced explanatory text
- no CTA-heavy styling
- minimal button treatment
- no long descriptive copy blocks inside the card

## Feed Rules

In feed, product mention cards should stay compact.

Rules:
- show a small preview only when the post mentions products
- keep image + product name as the dominant content inside the card
- de-emphasize or hide price by default
- avoid banner-like proportions
- keep card spacing supportive of the post reading flow
- keep the entire card clickable or make the product name clickable
- do not add extra source buttons

Desired effect:
- “this is the product mentioned in the post”
- not “this is a recommended item block”

## Detail Rules

In detail view, product mention cards may expand slightly because user curiosity is higher.

Rules:
- allow multiple product cards when the post references more than one product
- for 2 or fewer products, use a simple card array
- for 3 or more products, use either a 2-column tile layout or horizontal scroll
- price may be more acceptable here than in feed
- still keep internal system metadata hidden
- still avoid long explanatory product copy unless absolutely necessary

Desired effect:
- “here are the products mentioned in this post”
- not “here is the evidence processing system”

## Visual Tone

Product mention cards should:
- feel integrated into a social discussion interface
- avoid polished shopping-mall aesthetics
- keep price emphasis low
- avoid oversized headers and section titles
- maintain consistent image ratio and card height

The UI should remain compatible with a Threads-like reading rhythm.

## Link Behavior

Link behavior should stay simple.

Preferred patterns:
- card click
- product name click

Avoid:
- dedicated `Open source` buttons
- extra CTA rows
- multiple competing click targets

## Development Guardrails

Internal logic may continue to track:
- matching logic
- fallback state
- generated/real source type
- ranking or scoring

But the production serializer or UI-facing view model should pass only simplified fields needed for user display.

Recommended implementation guardrails:
- strip debug and internal fields from production rendering
- keep generated/fallback state out of user-facing text
- separate feed and detail card variants if needed
- prefer a single primary click target

## QA Guardrails

Before shipping, check:
- does the user recognize the product before seeing any system explanation?
- does the card feel like part of the post rather than a commerce module?
- does the reading flow remain natural?
- is price visually secondary?
- do multiple product cards avoid information overload?
- is any internal metadata still leaking into production UI?

## Anti-Patterns

The following outcomes are considered policy violations:
- cards labeled with internal evidence language
- cards that explain fallback behavior to end users
- generated/real labels visible in the UI
- product cards that are visually louder than the post itself
- metadata-only product blocks with no clear product preview behavior
- commerce-heavy cards that break the community-post tone
- editorial interpretation blocks such as repeated debate summaries, expected reaction summaries, or angle chips that restate the post instead of helping the user browse products

## One-Line Policy

Show the actual referenced product image and product name as a lightweight mention preview. Hide all evidence, fallback, generated, and other internal system terminology from user-facing UI.
