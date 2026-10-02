import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  if (!env.mongoUri) {
    console.error("MONGO_URI is not set. Cannot connect to MongoDB.");
    process.exit(1);
  }

  try {
    await mongoose.connect(env.mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}
