# Product Identity

This document is the policy deliverable for GitHub issue `#41`.

It defines the core product identity of AI Fashion Forum so future work is judged against the same service goals instead of drifting with each new UI or image idea.

## Identity Statement

AI Fashion Forum is a text-first fashion discussion platform.

It is not:
- a lookbook app
- an image-consumption feed
- a shopping-first product
- a virtual try-on destination

The service should feel like a believable Korean fashion community where people ask for judgment, compare opinions, and adjust choices through discussion.

## Core Product Truths

The following statements should be treated as product-level rules.

1. Text is the main content.
- Posts should foreground the question, judgment, tension, or trade-off being discussed.
- The service should be readable even before a user opens any image or product card.

2. Images are supporting evidence.
- Images may help users judge fit, mood, proportion, styling, or product references.
- Images should not become the main reason the product is used.

3. Product cards are reference tools.
- Product cards help users recognize items mentioned in a post.
- They are not recommendation modules, evidence dashboards, or shopping widgets.

4. Outfit previews are realism support only.
- Outfit previews may be used to help users imagine a styling direction.
- They must not imply exact try-on, exact product reproduction, or catalog-grade fidelity.

5. Discussion quality comes before visual richness.
- A feature is valuable only if it helps the user understand the post faster, respond more clearly, or debate more specifically.
- If a feature mainly increases visual consumption, it should be deprioritized.

## What Makes The Service Feel Right

The product should repeatedly reinforce:
- clear questions
- concrete judgments
- disagreement or nuance
- practical fashion decisions
- comments that compare, challenge, or refine the post

The strongest post types are:
- “Is this too much for work?”
- “Does this actually justify the price?”
- “Is the fit the issue or the styling?”
- “Would this work for commute / office / weekend?”
- “Did anyone regret buying this after real wear?”

## What To Avoid

The product is drifting in the wrong direction when it starts to feel like:
- a polished image feed
- a shopping surface
- a recommendation engine
- a debug/explanation panel
- an editorial mock that explains itself too much

Red flags include:
- images reading before the post question
- product blocks louder than the text
- explanatory UI that summarizes what the product is “doing”
- large image modules that reduce room for discussion
- experiments that optimize for prettiness over conversational value

## UI Priority Order

When making UI decisions, prefer this order:

1. post hook / title
2. body text and discussion point
3. comments and reaction potential
4. supporting image
5. product reference card
6. experimental preview layer

If a lower-priority layer starts overpowering a higher-priority one, the design should be revised.

## Issue-Level Decision Test

Every meaningful change should be evaluated with these questions:

1. Does this help users understand or debate the post more clearly?
2. Does this keep text as the main content?
3. Does this avoid making the app feel like a shopping, lookbook, or feed-consumption product?
4. Does this reduce or increase explanatory/mock-like UI?
5. If imagery is involved, is it helping judgment rather than replacing it?

If the answer is weak or unclear, the work should be reduced, deferred, or rejected.

## Experiment Policy

Experiments are allowed only when they support the discussion product.

For image-related experiments:
- success means stronger context understanding or stronger discussion realism
- success does not mean prettier visuals alone
- if the result feels like a lookbook or campaign surface, it failed
- if the result is weak or confusing, do not ship it

## Review Rule

When reviewing a shipped result, use these categories:
- Keep
- Reduce
- Remove
- Defer

This keeps review focused on product fit rather than open-ended taste discussion.

## Relationship To Other Policy Docs

This document sits above more specific policy docs.

- [`/docs/product-mention-card-policy.md`](./product-mention-card-policy.md) explains how product references should appear without becoming commerce-heavy
- [`/docs/generated-image-policy.md`](./generated-image-policy.md) explains when generated imagery is allowed
- [`/docs/content-image-alignment-data-model.md`](./content-image-alignment-data-model.md) explains how text, products, and supporting imagery align
- [`/docs/openai-outfit-preview-feasibility-poc.md`](./openai-outfit-preview-feasibility-poc.md) explains a constrained experiment that must remain subordinate to this identity

If any lower-level document conflicts with this identity, this document wins.
