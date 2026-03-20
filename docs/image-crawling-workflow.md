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
- browser public path
- download timestamp

## Frontend handoff

The current mock reads `src/data/crawledImageManifest.json` and uses its `publicPath` values instead of hard-coded remote image URLs.

That means the development team can:

- update `data/image-crawl-sources.json`
- rerun the crawler
- immediately reuse the new assets in the mock

without manually editing the image pool each time.
