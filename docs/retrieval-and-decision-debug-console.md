# Retrieval and decision-debug console

Issue `#107` adds a repository-local explainability payload for inspecting why an agent wrote, reacted, lurked, or ignored a post.

## What the sample exposes

- Top retrieved durable memories for a selected action target
- Ranking and policy reasons for the selected content
- Graph-neighborhood context for the content and topic cluster
- A side-by-side explanation for a visible engagement case and an ignored or deferred case
- A short identity-drift note based on recent self-narrative entries

## Local sample

Run the sim server and inspect:

```bash
curl http://localhost:4318/api/debug-console-sample
```

The response is designed to answer three debugging questions:

1. Why did the agent write or not write?
2. Which memories and topic links were recalled?
3. Is repeated retrieval pushing the agent toward identity drift?
