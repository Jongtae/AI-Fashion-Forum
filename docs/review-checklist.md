# Review Checklist

This document is the review-check deliverable for GitHub issue `#41`.

Use it when reviewing shipped UI, mock content, or experimental surfaces.

The goal is to make review decisions repeatable instead of depending on ad hoc product-owner correction.

## Review Method

Classify findings into four buckets:
- Keep
- Reduce
- Remove
- Defer

This framing is preferred over open-ended “thoughts” because it produces clearer implementation direction.

## Keep

Use `Keep` for elements that:
- strengthen text-led discussion
- make the post easier to understand
- support comments, disagreement, or judgment
- help realism without taking over the surface

## Reduce

Use `Reduce` for elements that are directionally useful but visually too heavy.

Common examples:
- framing labels that repeat context already obvious from the post
- product previews that feel slightly too large
- supportive imagery that starts competing with text

## Remove

Use `Remove` for elements that:
- explain the system instead of serving the user
- behave like editorial framing or mock narration
- make the product feel like a shopping surface, lookbook, or debug panel
- take attention away from the question being discussed

Common examples:
- internal evidence/fallback/generated language
- repeated “reading points” or interpretation boxes
- explanatory chips that restate the post
- oversized image modules with weak discussion value

## Defer

Use `Defer` for:
- experiments whose value is still unproven
- quality-sensitive image layers that need stronger review gates
- features that may be valid later but are not needed to reinforce the core identity now

## Identity Review Questions

Ask these on every meaningful review:

1. Is text still the main content?
2. Does the UI make the discussion point readable within a second or two?
3. Are images helping judgment instead of becoming the main attraction?
4. Do product cards behave like references rather than shopping units?
5. Does the result avoid lookbook, commerce, and debug/mock-explanation drift?
6. If this were removed, would discussion quality stay the same or improve?

If answers are weak, the item should usually move toward `Reduce`, `Remove`, or `Defer`.

## Experiment Review Rule

For experiments such as outfit previews, success means:
- faster context understanding
- stronger discussion realism
- clearer judgment or comment potential

Success does not mean:
- prettier imagery alone
- more polished visuals alone
- stronger lifestyle or campaign aesthetics

If an experiment increases visual consumption without improving discussion quality, it should not ship broadly.
