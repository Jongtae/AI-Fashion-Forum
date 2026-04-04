# Public Seed Corpus Pipeline

This pipeline rebuilds the simulation seed world from recent public fashion/community posts.

## Source families

- Reddit public JSON feeds for fashion-related subreddits
- Mastodon public tag timelines for fashion-related tags

These sources were chosen because they are publicly accessible and support repeatable collection without requiring private credentials.

## Outputs

- `data/seed-corpus/public/recent-fashion-corpus.json`
  - 100 normalized recent source posts
- `data/seed-corpus/public/recent-fashion-seed-profiles.json`
  - 1000 derived seed profiles
- `data/seed-corpus/public/recent-fashion-agent-state-candidates.json`
  - 1000 agent-state candidates derived from the public seed profiles

## Commands

```bash
npm run crawl:public-seed-corpus
npm run derive:public-seed-profiles
npm run rebuild:public-seed-world
```

The one-step rebuild command runs:
1. corpus crawl
2. 1000 seed profile derivation
3. agent-state candidate generation

## Notes

- The active simulation state is not overwritten automatically.
- If you want to run the agent server from the public corpus candidates, point `AGENT_STATE_CANDIDATES_FILE` at `data/seed-corpus/public/recent-fashion-agent-state-candidates.json`.
- Bluesky and Discord remain follow-up source families for public crawl adapters when accessible collection paths are confirmed.
