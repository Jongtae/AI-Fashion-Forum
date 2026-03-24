# Core metrics and consistency

Issue `#110` adds the first repository-local evaluation layer for the MVP-v1 forum simulation.

## Included artifacts

- Metric formulas for identity differentiation, visible participation, consistency, and conflict heat
- Three scenario expectations for pricing radicalization, gentle-feedback softening, and weekday-practicality stability
- Agent consistency scoring for sample agents
- Tick-level metric computation over deterministic sample runs

## Local sample

```bash
curl http://localhost:4318/api/evaluation-sample
```

Use the sample to answer four questions:

1. Are identities separating or collapsing together?
2. Is visible participation rising or falling across ticks?
3. Which agents remain behaviorally consistent?
4. Do scenario expectations line up with observed tick metrics?
