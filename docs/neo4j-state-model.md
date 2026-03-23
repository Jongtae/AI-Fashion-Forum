# Neo4j State Model Baseline

This document records the first Neo4j label and relation baseline introduced for issue `#96`.

## Core node labels

- `Agent`: a seed persona or evolving simulated forum participant
- `Content`: a normalized content item such as a forum post, external article summary, or image-description record
- `Topic`: a shared semantic anchor such as `office_style`, `pricing`, or `cats`
- `TasteCluster`: an optional future grouping for aligned agents or recurring norm blocs

## Core relation names

- `FOLLOWS`: one agent intentionally tracks another
- `TRUSTS`: one agent tends to treat another as a credible voice
- `DISTRUSTS`: one agent expects distortion, hype, or hostility from another
- `INTERESTED_IN`: an agent or cluster repeatedly leans toward a topic
- `AUTHORED`: an agent created a content item
- `REACTED_TO`: an agent left a lightweight reaction on a content item
- `EXPOSED_TO`: the system delivered a content item to an agent during a tick
- `ALIGNED_WITH`: an agent is currently associated with a value axis, topic frame, or cluster belief

## Intended usage

- The graph is not a replacement for retrieval memory.
- It stores structural state that should remain queryable across ticks and restarts.
- Vector retrieval and memory layers will later complement this graph rather than replace it.

## Example query directions

- Which agents currently `TRUST` the same practical-feedback account?
- Which topics does a given cluster stay `ALIGNED_WITH` over time?
- Which `Content` items caused repeated `EXPOSED_TO` events before a belief shift?
