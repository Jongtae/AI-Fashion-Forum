# Product Image Binding And Layout Rules

This document is the implementation-planning deliverable for GitHub issue `#20`.

It turns the product rule from `#19` into concrete development behavior for mock data and UI rendering.

## Current repository reality

The current repository already has:

- source-linked product references in `FashionThreadPage.jsx`
- a generic crawl manifest in `src/data/crawledImageManifest.json`
- alignment guidance in `docs/content-image-alignment-data-model.md`

The current crawl manifest is evidence-typed, but not yet product-bound.
That means the frontend cannot honestly treat the current image pool as exact product imagery for named-item posts.

Because of that, the default behavior for named-item posts must be:

- block unrelated generic hero imagery
- render product-aware cards or galleries instead
- expand into linked source cards in thread detail

## Minimum post shape

For named-item posts, the frontend should carry a post-level `productEvidence` object.

Minimum shape:

```js
productEvidence: {
  has_named_product_refs: boolean,
  representative_mode: "single_product_tile" | "product_tile_gallery",
  fallback_mode: "product_reference_cards_only",
  blocked_generic_image_id: string | null,
  bindings: [
    {
      id: string,
      title: string,
      source: string,
      price: string,
      note: string,
      role: "대표 근거" | "보조 근거",
    },
  ],
}
```

## Product image binding rules

### 1. Binding source

Each named product reference should bind from a source-backed product record, not from a mood image.

In the current mock that means:

- `SOURCE_LIBRARY` is the binding source of truth
- `TOPIC_SOURCES` decides which named products are central to a post
- `productEvidence.bindings` is derived from those linked source records

### 2. Single-product posts

If one named product is central to the post:

- use `single_product_tile`
- show one representative product card in feed and search
- expand into the same named source card in thread detail

### 3. Multi-product posts

If two or more named products are central to the post:

- use `product_tile_gallery`
- show up to two visible product tiles in feed and search
- show all linked product tiles in thread detail
- keep the first binding as `대표 근거` and the rest as `보조 근거`

## Representative image selection rules

Representative selection must follow evidence priority.

1. Use a directly linked product image only if it is actually bound to the named item.
2. Use an outfit image only if the named product is visibly present and the post judgment depends on styling context.
3. If neither of the above is available, do not show a generic hero image.
4. Fall back to product reference cards and expose that the generic image was blocked.

In the current repository state, rule 4 is the normal path because `crawledImageManifest.json` is not yet keyed to exact named products.

## View-specific behavior

### Feed card

- reserve the image slot for a compact product-evidence tile
- show one tile for single-product posts
- show two-up tiles for multi-product posts when needed
- do not display unrelated crawled hero images

### Search result card

- follow the same rule as the feed card
- keep the compact card height stable even when product images are unavailable
- show the same representative mode used by the feed

### Thread detail

- replace the hero-image area with a larger product-evidence board for named-item posts
- show all linked product bindings
- keep linked source cards below so users can open the original product references
- surface representative mode and fallback mode in the evidence summary

## Fallback behavior

If valid product-bound imagery is missing:

- never substitute an unrelated editorial, stock, or mood image
- keep the layout stable with product cards
- record which generic image was blocked through `blocked_generic_image_id`
- state the fallback mode as `product_reference_cards_only`

This fallback is honest, stable, and frontend-safe.

## Development review answers

### Do we currently have enough product image assets to support this rule?

No.
The current crawl manifest is aligned by evidence type and topic family, not by exact named product.
That is why cards-only fallback remains necessary.

### Should feed cards support multi-tile layouts, or should this be detail-only?

Yes, but keep it narrow.
Feed and search should support a compact two-up tile layout at most.
Anything denser should stay detail-only.

### Is the current data shape sufficient for product-image binding?

For the mock frontend, yes.
`productEvidence` is enough to stop mismatched imagery and express layout intent.
For a later pipeline, Data Engineering should formalize a stricter product-bound asset schema.

### What is the simplest layout that satisfies the product rule?

Cards-only product evidence in feed/search plus a full evidence board in detail.
This is the minimum layout that removes contradictory imagery without overbuilding the mock.

### Where do we need fallback because asset coverage is incomplete?

Fallback is required for any named-item post whose supporting visuals come only from the current generic crawl manifest.

## Data Engineering follow-up

To remove the cards-only fallback later, Data Engineering will need:

- product-bound asset identifiers
- a way to map `SOURCE_LIBRARY` records to asset records
- explicit support for one-to-many bindings between posts and product visuals
- validation that the representative image is proving the post's main judgment target
