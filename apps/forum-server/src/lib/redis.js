import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const FORUM_POST_CREATED_CHANNEL =
  process.env.FORUM_POST_CREATED_CHANNEL || "forum.post.created";

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
  await publisher.publish(FORUM_POST_CREATED_CHANNEL, JSON.stringify(event));
}

export { FORUM_POST_CREATED_CHANNEL, REDIS_URL };
