import mongoose from "mongoose";
import { app } from "../app.js";
import { env } from "./env.js";

/*
 * Entry point for hosting the API as a serverless function (Vercel: api/index.mjs).
 * Each cold start connects to MongoDB once; warm requests reuse the connection.
 * Unlike server.ts it never calls process.exit — a failed connection just returns 503.
 */

let connecting: Promise<typeof mongoose> | null = null;

function ensureDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  if (!env.mongoUri) return Promise.reject(new Error("MONGODB_URI is not set"));
  connecting ??= mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 }).catch((error: unknown) => {
    connecting = null; // let the next request try again
    throw error;
  });
  return connecting;
}

type Handler = (request: Parameters<typeof app>[0], response: Parameters<typeof app>[1]) => Promise<void>;

export const handler: Handler = async (request, response) => {
  try {
    await ensureDB();
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    response.statusCode = 503;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ message: "Database unavailable. Check MONGODB_URI in the hosting settings." }));
    return;
  }
  app(request, response);
};
