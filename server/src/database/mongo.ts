import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectToDatabase() {
  if (!env.mongoUri) {
    console.warn(
      "MONGODB_URI is not set. The API will run without a database connection.",
    );
    return;
  }

  await mongoose.connect(env.mongoUri);
  console.log("Connected to MongoDB");
}
