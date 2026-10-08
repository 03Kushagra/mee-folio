import { Router } from "express";
import { login, session } from "../lib/auth.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/session", session);
