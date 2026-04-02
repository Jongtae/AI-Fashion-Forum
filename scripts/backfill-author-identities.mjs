#!/usr/bin/env node
/**
 * backfill-author-identities.mjs
 *
 * Populate existing MongoDB posts/comments/agentstates with humanized author
 * display names, handles, avatar URLs, and locale hints.
 *
 * The script is idempotent: re-running it will keep the same deterministic
 * identity assignments for the same author/agent id.
 *
 * Usage:
 *   node scripts/backfill-author-identities.mjs
 *   node scripts/backfill-author-identities.mjs --dry-run
 *   node scripts/backfill-author-identities.mjs --collection posts
 *
 * Env:
 *   MONGODB_URI (default: mongodb://localhost:27017/ai-fashion-forum)
 */

import mongoose from "mongoose";
import { resolveAuthorIdentity } from "@ai-fashion-forum/shared-types";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-fashion-forum";

function parseArgs(argv) {
  const args = {
    dryRun: false,
    collection: null,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (value === "--collection" && next) {
      args.collection = String(next).trim();
      index += 1;
      continue;
    }
  }

  return args;
}

function inferAuthorType(authorId = "", authorType = "") {
  const normalized = String(authorType || "").trim().toLowerCase();
  if (normalized === "agent" || normalized === "user") return normalized;
  return /^a\d+$/i.test(String(authorId || "").trim()) ? "agent" : "user";
}

function buildAuthorIdentity(doc) {
  const authorId = String(doc.authorId || doc.agentId || "").trim();
  const authorType = inferAuthorType(authorId, doc.authorType);
  const isAgent = authorType === "agent";
  return resolveAuthorIdentity({
    authorId,
    authorType,
    displayName: isAgent ? "" : doc.authorDisplayName || doc.display_name || doc.displayName || "",
    handle: isAgent ? "" : doc.authorHandle || doc.handle || "",
    avatarUrl: isAgent ? "" : doc.authorAvatarUrl || doc.avatar_url || doc.avatarUrl || "",
    localeHint: isAgent ? "" : doc.authorLocale || doc.avatar_locale || doc.avatarLocale || "",
  });
}

function buildUpdate(doc, identity) {
  return {
    authorDisplayName: identity.displayName,
    authorHandle: identity.handle,
    authorAvatarUrl: identity.avatarUrl,
    authorLocale: identity.avatarLocale,
  };
}

async function backfillCollection(collection, query = {}) {
  const docs = await collection
    .find(query, {
      projection: {
        authorId: 1,
        authorType: 1,
        agentId: 1,
        authorDisplayName: 1,
        authorHandle: 1,
        authorAvatarUrl: 1,
        authorLocale: 1,
        displayName: 1,
        display_name: 1,
        handle: 1,
        avatarUrl: 1,
        avatar_url: 1,
        avatarLocale: 1,
        avatar_locale: 1,
      },
    })
    .toArray();

  const grouped = new Map();
  for (const doc of docs) {
    const identity = buildAuthorIdentity(doc);
    const key = `${inferAuthorType(doc.authorId, doc.authorType)}:${String(doc.authorId || "").trim()}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        filter: {
          authorId: String(doc.authorId || "").trim(),
          authorType: inferAuthorType(doc.authorId, doc.authorType),
        },
        update: buildUpdate(doc, identity),
      });
    }
  }

  const updates = [...grouped.values()];

  if (updates.length === 0) {
    return { matched: 0, modified: 0 };
  }

  if (process.env.DEBUG_AUTHOR_IDENTITY_BACKFILL === "1") {
    console.log(`[backfill-author-identities] ${collection.collectionName}: ${updates.length} author groups`);
  }

  let matched = 0;
  let modified = 0;
  for (const entry of updates) {
    const result = await collection.updateMany(entry.filter, { $set: entry.update });
    matched += result.matchedCount || 0;
    modified += result.modifiedCount || 0;
  }

  return { matched, modified };
}

async function backfillAgentStates(collection, query = {}) {
  const docs = await collection
    .find(query, {
      projection: {
        agentId: 1,
        handle: 1,
        display_name: 1,
        avatar_url: 1,
        avatar_locale: 1,
      },
    })
    .toArray();

  const grouped = new Map();
  for (const doc of docs) {
    const identity = resolveAuthorIdentity({
      authorId: doc.agentId,
      authorType: "agent",
      displayName: "",
      handle: "",
      avatarUrl: "",
      localeHint: "",
    });

    const key = String(doc.agentId || "").trim();
    if (!grouped.has(key)) {
      grouped.set(key, {
        filter: { agentId: key },
        update: {
          handle: identity.handle,
          display_name: identity.displayName,
          avatar_url: identity.avatarUrl,
          avatar_locale: identity.avatarLocale,
        },
      });
    }
  }

  const updates = [...grouped.values()];

  if (updates.length === 0) {
    return { matched: 0, modified: 0 };
  }

  let matched = 0;
  let modified = 0;
  for (const entry of updates) {
    const result = await collection.updateMany(entry.filter, { $set: entry.update });
    matched += result.matchedCount || 0;
    modified += result.modifiedCount || 0;
  }

  return { matched, modified };
}

async function main() {
  const { dryRun, collection: collectionName } = parseArgs(process.argv);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const targetCollections = collectionName ? [collectionName] : ["posts", "comments", "agentstates"];
  const report = [];

  for (const name of targetCollections) {
    const collection = db.collection(name);
    let result;

    if (name === "agentstates") {
      result = await backfillAgentStates(collection);
    } else if (name === "posts" || name === "comments") {
      result = await backfillCollection(collection);
    } else {
      throw new Error(`Unsupported collection: ${name}`);
    }

    report.push({ name, ...result });

    if (dryRun) {
      console.log(`[backfill-author-identities] dry-run ${name}:`, result);
    } else {
      console.log(`[backfill-author-identities] updated ${name}:`, result);
    }
  }

  if (dryRun) {
    console.log("[backfill-author-identities] dry-run complete");
  } else {
    console.log("[backfill-author-identities] backfill complete");
  }

  await mongoose.disconnect();
  return report;
}

main().catch((error) => {
  console.error("[backfill-author-identities] Failed:", error);
  process.exit(1);
});
