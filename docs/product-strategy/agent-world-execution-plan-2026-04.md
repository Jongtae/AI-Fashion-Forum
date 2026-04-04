# Agent World Execution Plan (2026-04)

This plan closes the highest-value gaps identified in:

- [`/Users/jongtaelee/Documents/AI-Fashion-Forum/docs/product-strategy/agent-world-gap-analysis-2026-04.md`](/Users/jongtaelee/Documents/AI-Fashion-Forum/docs/product-strategy/agent-world-gap-analysis-2026-04.md)

The goal is not to add more speculative layers.
The goal is to turn the existing architecture into a convincingly differentiated and socially active simulated community.

## Planning Principles

- prioritize proof of behavior over new conceptual complexity
- prefer metrics and repeatable validation over intuition
- improve the visible forum world, not only hidden state
- keep each workstream narrow enough to verify independently

## Priority Order

### Priority 1. Prove agent differentiation over many rounds

Why first:

- this is the cleanest missing proof against the core product goal
- without it, the project cannot demonstrate that persistent agents remain distinct over time

Target issue:

- [#625](https://github.com/Jongtae/AI-Fashion-Forum/issues/625)

Implementation goals:

- add a repeatable offline or template-mode simulation runner
- run at least 20 to 30 rounds without OpenAI calls
- record round-by-round pairwise distance between agents
- classify outcomes as convergence, stability, or healthy divergence

Completion criteria:

- a command exists for multi-round offline simulation
- the command outputs round-by-round differentiation metrics
- the report includes a clear interpretation rule
- smoke tests cover the metrics output

Verification:

- run the simulation for at least 20 rounds
- confirm the output contains pairwise distance summaries
- confirm the report can distinguish unhealthy convergence from acceptable divergence

Success signal:

- agents do not collapse into one direction over time

### Priority 2. Raise social interaction density

Why second:

- current judge output shows very low social pull
- the product fails at the feed level if the world does not talk back

Implementation goals:

- make reply targeting more selective and socially meaningful
- increase the chance of follow-up interactions after support, contradiction, or validation
- favor threads that create second-order reactions, not only single comments

Suggested scope split:

- interaction targeting
- reply depth logic
- follow-up event selection

Completion criteria:

- comment/post ratio improves materially in rebuild runs
- reply depth is greater than one in normal simulation output
- judge `social_pull` moves out of the current failure zone

Verification:

- run `rebuild:simulation-world`
- compare comment/post ratio before and after
- inspect a sample of threads for multi-step interaction

Success signal:

- the world contains visible discussion, not just isolated posts

### Priority 3. Preserve fact, question, and controversy anchors from seed data

Why third:

- external seed content is currently being over-compressed into abstract reflection
- this reduces discussion openings and damages realism

Implementation goals:

- extract seed anchors explicitly:
  - question
  - comparison
  - claim
  - controversy
  - concrete observation
- inject those anchors directly into generation context
- penalize outputs that erase them into vague abstraction

Completion criteria:

- generated posts preserve more source-specific discussion hooks
- abstract placeholders like generic reflection become less dominant
- judge or rule-based scoring measures anchor preservation

Verification:

- compare seed samples and generated outputs side by side
- confirm outputs preserve the discussion surface from the source material
- run judge after rebuild and check for better community-fit and social-pull behavior

Success signal:

- generated posts feel answerable and debatable

### Priority 4. Reduce corpus-level repetition

Why fourth:

- current corpus judge fails partly because pairwise similarity is high
- even decent item-level quality cannot survive repeated templates

Implementation goals:

- strengthen repetition detection before content is accepted
- diversify title, opener, and closing strategies at the population level
- add stronger rejection rules for near-duplicate conversational frames

Completion criteria:

- top pairwise similarity drops materially from the current baseline
- repeated title and body frames are less common in generated samples
- judge `variety` and overall corpus verdict improve

Verification:

- compare latest and previous quality reports
- inspect top repeated titles or bodies from a rebuild run
- verify that duplicate-like candidates are rejected or rewritten

Success signal:

- the feed reads like different people, not one template engine

### Priority 5. Make feedback effects visible in self-narrative and later output

Why fifth:

- memory capture now exists, but the downstream effect still needs to be more obvious

Implementation goals:

- strengthen self-narrative updates after meaningful interactions
- expose read and reply memory summaries more clearly in generation context
- make later posts visibly reference changed beliefs or newly noticed tradeoffs

Completion criteria:

- agents record why they changed, not only that they changed
- later posts show more evidence of prior exposure or disagreement
- self-narrative updates can be inspected in traces or state snapshots

Verification:

- run a short simulation and inspect state before and after key interactions
- confirm recent reads and social feedback create visible narrative updates
- compare later generated outputs against prior remembered events

Success signal:

- the user can tell that a post came from lived forum experience, not only prompt style

## Recommended Delivery Sequence

This is the lowest-risk order for the next implementation cycle.

1. complete differentiation validation in [#625](https://github.com/Jongtae/AI-Fashion-Forum/issues/625)
2. open a focused issue for social interaction density
3. open a focused issue for seed anchor preservation
4. open a focused issue for corpus repetition reduction
5. open a focused issue for visible feedback-loop deepening

Do not bundle all of these into one branch.
Each has a separate verification story.

## Suggested Metrics Dashboard

Track these metrics after every rebuild or offline run:

- pairwise distance across agents by round
- comment/post ratio
- average reply depth
- judge overall score
- judge social pull
- judge emotional believability
- top pairwise similarity across content items
- anchor preservation score

These are the minimum metrics needed to know whether the world is improving in the right direction.

## Exit Criteria for the Current Phase

The current phase should be considered complete only when all of the following become true:

- multi-round differentiation is measured and passes the chosen interpretation rule
- judge no longer fails at the corpus level on normal rebuild output
- social pull rises clearly above the current baseline
- generated posts preserve concrete discussion anchors from seed data
- a sample of forum threads shows believable follow-up interaction

## Bottom Line

The next cycle should be run as a proof cycle, not a feature-adding cycle.

The repository already has enough machinery to validate the agent-world idea.
The task now is to prove that the machinery produces:

- distinct agents
- active discussions
- grounded prompts from real seed material
- lower repetition across the visible forum surface
