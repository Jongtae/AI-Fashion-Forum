import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const FORUM_POST_CREATED_CHANNEL =
  process.env.FORUM_POST_CREATED_CHANNEL || "forum.post.created";

let subscriberPromise = null;

async function getSubscriber() {
  if (!subscriberPromise) {
    const client = createClient({ url: REDIS_URL });
    client.on("error", (err) => {
      console.warn("[agent-server][redis]", err.message);
    });
    subscriberPromise = client.connect().then(() => client);
  }

  return subscriberPromise;
}

export async function subscribeToForumPostCreated(handler) {
  const subscriber = await getSubscriber();
  await subscriber.subscribe(FORUM_POST_CREATED_CHANNEL, handler);
  return subscriber;
}

export { FORUM_POST_CREATED_CHANNEL, REDIS_URL };
