import { connectDB, disconnectDB } from "../apps/forum-server/src/db.js";
import { Post } from "../apps/forum-server/src/models/Post.js";
import { buildReadablePostTitle } from "../packages/agent-core/index.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-fashion-forum";

function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function tokenize(text = "") {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function jaccardSimilarity(left = "", right = "") {
  const leftSet = new Set(tokenize(left));
  const rightSet = new Set(tokenize(right));
  if (!leftSet.size || !rightSet.size) {
    return 0;
  }

  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union ? intersection / union : 0;
}

function shouldRefreshTitle(post = {}) {
  if (post.authorType === "agent") {
    return true;
  }

  const explicitTitle = normalizeText(post.title);
  const content = normalizeText(post.content);
  if (!explicitTitle) {
    return true;
  }

  if (!content) {
    return false;
  }

  return (
    explicitTitle === content ||
    content.startsWith(explicitTitle) ||
    explicitTitle.startsWith(content.slice(0, 16)) ||
    jaccardSimilarity(explicitTitle, content) >= 0.72
  );
}

async function main() {
  await connectDB();

  const posts = await Post.find({}).lean();
  let updatedCount = 0;

  for (const post of posts) {
    if (!shouldRefreshTitle(post)) {
      continue;
    }

    const nextTitle = buildReadablePostTitle({
      mode: "run",
      sourceTitle: post.generationContext?.selectedContextLabel || post.tags?.[0] || "포럼 글",
      sourceTopics: Array.isArray(post.tags) ? post.tags : [],
      sourceSignal: post.generationContext?.selectedContextLabel || post.generationContext?.selectedTone || "",
      sourceSnippet: post.content || "",
      sourceBody: post.content || "",
      selectedContextLabel: post.generationContext?.selectedContextLabel || null,
      variationSeed: String(post._id || post.authorId || "").length,
    });

    if (!nextTitle) {
      continue;
    }

    await Post.updateOne({ _id: post._id }, { $set: { title: nextTitle } });
    updatedCount += 1;
  }

  console.log(
    JSON.stringify(
      {
        uri: MONGODB_URI,
        scanned: posts.length,
        updated: updatedCount,
      },
      null,
      2,
    ),
  );

  await disconnectDB().catch(() => {});
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDB().catch(() => {});
  process.exitCode = 1;
});
