import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/*
 * Admin login without extra packages.
 *
 * The password lives in server/.env (ADMIN_PASSWORD). Logging in returns a signed token:
 * "<expiry>.<signature>", where the signature is an HMAC of the expiry made with a key
 * derived from the password. The server can check a token without storing anything, and
 * changing the password signs everyone out.
 */

const TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const loginAttempts = new Map<string, number[]>();

const sha256 = (value: string) => createHash("sha256").update(value).digest();
const signingKey = () => sha256(`mee-folio-admin:${env.adminPassword}`);
const sign = (payload: string) => createHmac("sha256", signingKey()).update(payload).digest("base64url");

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isAdminConfigured() {
  return env.adminPassword.length > 0;
}

export function createToken() {
  const expiresAt = String(Date.now() + TOKEN_LIFETIME_MS);
  return { expiresAt: Number(expiresAt), token: `${expiresAt}.${sign(expiresAt)}` };
}

export function verifyToken(token: string) {
  if (!isAdminConfigured()) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false;
  return safeEqual(Buffer.from(signature), Buffer.from(sign(expiresAt)));
}

function tokenFrom(request: Request) {
  const header = request.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

/** Route guard: only lets requests with a valid admin token through. */
export function requireAdmin(request: Request, response: Response, next: NextFunction) {
  if (verifyToken(tokenFrom(request))) {
    next();
    return;
  }
  response.status(401).json({ message: "Please log in to the admin page." });
}

function tooManyAttempts(key: string) {
  const now = Date.now();
  const attempts = (loginAttempts.get(key) ?? []).filter((time) => now - time < LOGIN_WINDOW_MS);
  attempts.push(now);
  loginAttempts.set(key, attempts);
  if (loginAttempts.size > 5_000) loginAttempts.clear();
  return attempts.length > LOGIN_MAX_ATTEMPTS;
}

export function login(request: Request, response: Response) {
  if (!isAdminConfigured()) {
    response.status(503).json({ message: "Admin is not set up yet: add ADMIN_PASSWORD to server/.env and restart the server." });
    return;
  }

  if (tooManyAttempts(request.ip ?? "unknown")) {
    response.status(429).json({ message: "Too many attempts. Try again in 15 minutes." });
    return;
  }

  const password = typeof request.body?.password === "string" ? request.body.password : "";
  if (!safeEqual(sha256(password), sha256(env.adminPassword))) {
    response.status(401).json({ message: "Wrong password." });
    return;
  }

  response.json(createToken());
}

export function session(request: Request, response: Response) {
  response.json({ configured: isAdminConfigured(), loggedIn: verifyToken(tokenFrom(request)) });
}
