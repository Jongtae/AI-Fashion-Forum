import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  GRAPH_NODE_LABELS,
  GRAPH_RELATION_TYPES,
  SAMPLE_GRAPH_NODES,
  SAMPLE_GRAPH_RELATIONS,
  SAMPLE_STATE_SNAPSHOT,
  createGraphNode,
  createGraphRelation,
  serializeSnapshot,
} from "@ai-fashion-forum/shared-types";

function normalizeFilePath(target) {
  return target instanceof URL ? fileURLToPath(target) : target;
}

function ensureJsonFile(target, initialValue) {
  const resolved = normalizeFilePath(target);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  if (!fs.existsSync(resolved)) {
    fs.writeFileSync(resolved, JSON.stringify(initialValue, null, 2), "utf8");
  }

  return resolved;
}

function readJson(target, initialValue) {
  const resolved = ensureJsonFile(target, initialValue);
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function writeJson(target, value) {
  const resolved = ensureJsonFile(target, value);
  fs.writeFileSync(resolved, JSON.stringify(value, null, 2), "utf8");
}

export function appendEventLog({
  logFilePath,
  entries = [],
} = {}) {
  const current = readJson(logFilePath, []);
  const next = [...current, ...entries];
  writeJson(logFilePath, next);
  return next;
}

export function createEventLogEntries(runResult) {
  return runResult.entries.map((entry) => ({
    tick: entry.tick,
    actor_id: entry.actor_id,
    action: entry.action,
    target_id: entry.target_id || null,
    reason: entry.reason,
  }));
}

export function buildNeo4jSyncPayload({
  state = SAMPLE_STATE_SNAPSHOT,
} = {}) {
  const snapshot = serializeSnapshot(state);

  const topicNodes = Object.keys(
    snapshot.contents.reduce((accumulator, content) => {
      content.topics.forEach((topic) => {
        accumulator[topic] = true;
      });
      return accumulator;
    }, {}),
  ).map((topic) =>
    createGraphNode({
      node_id: `topic:${topic}`,
      label: GRAPH_NODE_LABELS.topic,
      properties: { topic },
    }),
  );

  const contentNodes = snapshot.contents.slice(0, 10).map((content) =>
    createGraphNode({
      node_id: content.content_id,
      label: GRAPH_NODE_LABELS.content,
      properties: {
        format: content.format,
        author_id: content.author_id,
      },
    }),
  );

  const authoredRelations = snapshot.contents.slice(0, 10).map((content) =>
    createGraphRelation({
      relation_id: `AUTH:${content.author_id}:${content.content_id}`,
      from: content.author_id,
      to: content.content_id,
      type: GRAPH_RELATION_TYPES.authored,
      weight: 1,
      properties: {
        created_tick: content.created_tick,
      },
    }),
  );

  const topicRelations = snapshot.contents.slice(0, 10).flatMap((content) =>
    content.topics.map((topic) =>
      createGraphRelation({
        relation_id: `TOPIC:${content.content_id}:${topic}`,
        from: content.content_id,
        to: `topic:${topic}`,
        type: GRAPH_RELATION_TYPES.exposedTo,
        weight: 0.5,
        properties: {
          source: "content_topic_membership",
        },
      }),
    ),
  );

  return {
    nodes: [
      ...snapshot.agents.map((agent) =>
        createGraphNode({
          node_id: agent.agent_id,
          label: GRAPH_NODE_LABELS.agent,
          properties: {
            handle: agent.handle,
            archetype: agent.archetype,
          },
        }),
      ),
      ...contentNodes,
      ...topicNodes,
    ],
    relations: [...authoredRelations, ...topicRelations],
  };
}

export function exportGraphVisualization({
  state = SAMPLE_STATE_SNAPSHOT,
} = {}) {
  const payload = buildNeo4jSyncPayload({ state });
  return {
    nodes: payload.nodes.map((node) => ({
      id: node.node_id,
      label: node.label,
      properties: node.properties,
    })),
    edges: payload.relations.map((relation) => ({
      id: relation.relation_id,
      source: relation.from,
      target: relation.to,
      label: relation.type,
    })),
  };
}

export function createCoreGraphQueries() {
  return [
    {
      name: "agent_trust_neighbors",
      cypher: "MATCH (a:Agent)-[r:TRUSTS]->(b:Agent) RETURN a.handle, b.handle, r.weight ORDER BY r.weight DESC LIMIT 10",
    },
    {
      name: "content_by_topic",
      cypher: "MATCH (c:Content)-[:EXPOSED_TO]->(t:Topic {topic: $topic}) RETURN c.content_id, c.format LIMIT 20",
    },
    {
      name: "authored_content",
      cypher: "MATCH (a:Agent {agent_id: $agent_id})-[:AUTHORED]->(c:Content) RETURN c.content_id, c.format, c.author_id LIMIT 20",
    },
    {
      name: "agent_interest_topics",
      cypher: "MATCH (a:Agent)-[r:INTERESTED_IN]->(t:Topic) RETURN a.handle, t.topic, r.weight ORDER BY r.weight DESC LIMIT 20",
    },
    {
      name: "content_topic_clusters",
      cypher: "MATCH (c:Content)-[:EXPOSED_TO]->(t:Topic) RETURN t.topic, count(c) AS content_count ORDER BY content_count DESC LIMIT 20",
    },
  ];
}

export function createGraphStorageSample({
  eventLogPath,
  state = SAMPLE_STATE_SNAPSHOT,
} = {}) {
  const seededLogEntries = appendEventLog({
    logFilePath: eventLogPath,
    entries: [
      {
        tick: 0,
        actor_id: "A02",
        action: "comment",
        target_id: "T01",
        reason: "practical fit feedback",
      },
      {
        tick: 1,
        actor_id: "A06",
        action: "react",
        target_id: "T15",
        reason: "backlash reaction",
      },
    ],
  });

  return {
    eventLogEntries: seededLogEntries.slice(-5),
    neo4jSync: buildNeo4jSyncPayload({ state }),
    graphExport: exportGraphVisualization({ state }),
    coreQueries: createCoreGraphQueries(),
  };
}
