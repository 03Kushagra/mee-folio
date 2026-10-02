import type { Request, Response } from "express";
import { Lead } from "../models/lead.model.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const recentRequests = new Map<string, number[]>();

function isRateLimited(key: string) {
  const now = Date.now();
  const timestamps = (recentRequests.get(key) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  timestamps.push(now);
  recentRequests.set(key, timestamps);

  if (recentRequests.size > 5_000) {
    recentRequests.clear();
  }

  return timestamps.length > RATE_LIMIT_MAX;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createLead(request: Request, response: Response) {
  const body = (request.body ?? {}) as Record<string, unknown>;

  // Honeypot field: real visitors never see it, so anything here is a bot.
  if (readString(body.website)) {
    response.status(201).json({ message: "Thanks" });
    return;
  }

  const name = readString(body.name);
  const email = readString(body.email).toLowerCase();
  const message = readString(body.message);
  const source = body.source === "contact" ? "contact" : "resume";

  if (!name || name.length > 100) {
    response.status(400).json({ message: "Please add your name (max 100 characters)." });
    return;
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    response.status(400).json({ message: "Please enter a valid email address." });
    return;
  }

  if (message.length > 1000) {
    response.status(400).json({ message: "Message must be 1000 characters or fewer." });
    return;
  }

  if (isRateLimited(request.ip ?? "unknown")) {
    response.status(429).json({ message: "Too many requests. Please try again later." });
    return;
  }

  try {
    await Lead.create({ email, message, name, source });
    response.status(201).json({ message: "Thanks" });
  } catch (error) {
    console.error("Failed to save lead:", error);
    response.status(500).json({ message: "Failed to save your details" });
  }
}
