# Simulation Intent Guardrails

This document is the intent lock for repository strategy, docs, and agent-guided planning.

Use it when there is any risk that the project may drift toward:

- a polished mock as the end goal
- a recommendation-product framing as the main thesis
- a single phenomenon such as taste divergence as if it were the product goal

## Core Intent

AI Fashion Forum is a fashion-community-domain AI-native simulation environment.

The goal is to build an environment where:

- agents or users carry state, memory, relationships, and exposure history
- community norms, conflict, clustering, identity shifts, and taste changes can emerge
- those dynamics can be observed, explained, replayed, and iterated on
- a company loop can inspect traces and test interventions against the environment

The target is the environment and its explainable mechanics.

It is not the goal to optimize for one specific phenomenon in isolation.

## What Taste Divergence Means Here

Taste divergence is not the product goal.

It is one possible emergent phenomenon inside the intended simulation environment, alongside:

- norm formation
- trust and status formation
- conflict escalation or cooling
- cluster formation
- role differentiation
- reaction to intervention
- identity stabilization or drift

If a document or agent starts treating taste divergence as the top-line goal, it is drifting away from the intended framing.

## Preferred Framing

Prefer language like:

- "simulation environment"
- "seed-world social system"
- "mechanism validation"
- "observable dynamics"
- "interventions and traces"
- "environment rules, memory, exposure, and relationships"

Be careful with language like:

- "build a taste-divergence simulator"
- "the goal is to split fashion tastes"
- "the main value is personalized recommendation"

Those may describe artifacts, subproblems, or visible outputs, but they should not replace the environment-first framing.

## Implications For Planning

When defining issues, specs, or agent prompts:

1. Center the environment before the phenomenon.
- Ask what world rules, memory rules, action schemas, or intervention levers are being defined.

2. Treat visible phenomena as evidence, not the mission.
- Ask what behaviors should become observable if the environment is working.

3. Keep the two-loop model intact.
- User society loop produces behavior.
- Company loop observes, evaluates, and changes levers.

4. Require replayable or inspectable artifacts where possible.
- actions
- traces
- state deltas
- memory evidence
- intervention logs

## Prompting Rule For Agents

If an agent is asked to propose requirements, plans, or issues, it should first preserve this distinction:

- primary goal: build and validate the AI-native social simulation environment
- secondary outcome: observe emergent dynamics within that environment

If necessary, the agent should explicitly restate that distinction before producing recommendations.
