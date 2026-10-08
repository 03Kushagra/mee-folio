import { Router } from "express";
import { createLead, listLeads } from "../controllers/lead.controller.js";
import { requireAdmin } from "../lib/auth.js";

export const leadRouter = Router();

leadRouter.post("/", createLead);
// Only the admin page can read the list.
leadRouter.get("/", requireAdmin, listLeads);
