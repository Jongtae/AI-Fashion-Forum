# Image Crawling Workflow

This workflow is the implementation follow-up to GitHub issue [#5](https://github.com/Jongtae/AI-Fashion-Forum/issues/5) and is tracked in GitHub issue [#6](https://github.com/Jongtae/AI-Fashion-Forum/issues/6).

Its goal is simple:

- let Data Engineering define approved image acquisition inputs
- download those assets into the repository
- generate a manifest the frontend team can consume directly

## Input

Input records live in `data/image-crawl-sources.json`.

Each record should declare:

- `image_id`
- `topic_types`
- `image_evidence_type`
- `image_evidence_role`
- `visible_evidence_note`
- `wear_state`
- `source_provider`
- `source_url`
- `source_note`

These fields intentionally mirror the evidence-driven direction described in issue `#5`.

## Run

```bash
npm run crawl:images
```

## Output

The script generates:

- downloaded files in `public/crawled-images/`
- a consumable manifest in `src/data/crawledImageManifest.json`

Each manifest record includes:

- original source metadata
- evidence tags
- generated local file name
- repo-local path
- app-relative asset path
- download timestamp

## Frontend handoff

The current mock reads `src/data/crawledImageManifest.json` and resolves each `assetPath` against the Vite `BASE_URL` instead of hard-coded remote image URLs.

That means the development team can:

- update `data/image-crawl-sources.json`
- rerun the crawler
- immediately reuse the new assets in the mock

without manually editing the image pool each time.

## Approval boundary

This workflow only acquires and packages assets. It does not by itself approve them for shipped use.

Before an outfit-oriented crawled image is considered valid for production UI, it must also pass:

- metadata-alignment review
- Korean UGC realism review

Do not treat a downloaded asset as approved just because it exists in `public/crawled-images/` or `src/data/crawledImageManifest.json`.

## Legacy seed warning

Legacy mock images or earlier image-pool seeds must be treated as untrusted inputs.

They may remain in the crawl manifest for historical reasons, but they should not be reused for outfit-oriented community posts unless they are explicitly revalidated against:

- actual image content
- claimed `image_evidence_type`
- claimed scene context
- Korean everyday UGC realism
