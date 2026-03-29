import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const FORUM_POST_CREATED_CHANNEL =
  process.env.FORUM_POST_CREATED_CHANNEL || "forum.post.created";
const FORUM_COMMENT_CREATED_CHANNEL =
  process.env.FORUM_COMMENT_CREATED_CHANNEL || "forum.comment.created";

let publisherPromise = null;

async function getPublisher() {
  if (!publisherPromise) {
    const client = createClient({ url: REDIS_URL });
    client.on("error", (err) => {
      console.warn("[forum-server][redis]", err.message);
    });
    publisherPromise = client.connect().then(() => client);
  }

  return publisherPromise;
}

export async function publishForumPostCreated(event) {
  const publisher = await getPublisher();
  try {
    await publisher.publish(FORUM_POST_CREATED_CHANNEL, JSON.stringify(event));
  } finally {
    if (publisher.isOpen) {
      await publisher.disconnect().catch(() => {});
      publisherPromise = null;
    }
  }
}

export async function publishForumCommentCreated(event) {
  const publisher = await getPublisher();
  try {
    await publisher.publish(FORUM_COMMENT_CREATED_CHANNEL, JSON.stringify(event));
  } finally {
    if (publisher.isOpen) {
      await publisher.disconnect().catch(() => {});
      publisherPromise = null;
    }
  }
}

export { FORUM_POST_CREATED_CHANNEL, FORUM_COMMENT_CREATED_CHANNEL, REDIS_URL };
