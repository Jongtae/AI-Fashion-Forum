# Social dynamics and batch runner

Issue `#111` adds a repository-local batch experiment layer for comparing group-level dynamics across seeds and policy configurations.

## Included artifacts

- Group metrics for cluster cohesion, polarization, and influence concentration
- Batch execution over more than 10 experiment runs
- Structured CSV export alongside JSON output
- A generated report artifact with summary lines and recommendations

## Local sample

```bash
curl http://localhost:4318/api/batch-experiment-sample
```

The sample is meant to answer:

1. Which seed/policy combinations stay most consistent?
2. Which combinations polarize the forum fastest?
3. Is influence becoming too concentrated in a few agents?
4. Which batch result should become the next default demo or intervention candidate?
