import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profile.controller.js";
import { requireAdmin } from "../lib/auth.js";

export const profileRouter = Router();

profileRouter.get("/", getProfile);
profileRouter.put("/", requireAdmin, updateProfile);
