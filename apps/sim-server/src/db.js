import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ai-fashion-forum";

let connected = false;

export async function connectDB() {
  if (connected) return;
  await mongoose.connect(MONGODB_URI);
  connected = true;
  console.log(`[db] Connected to MongoDB: ${MONGODB_URI}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
  connected = false;
}

export default mongoose;
