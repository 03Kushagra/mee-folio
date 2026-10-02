import { Router } from "express";
import { createLead } from "../controllers/lead.controller.js";

export const leadRouter = Router();

// Intentionally no public GET: view leads in your MongoDB dashboard.
leadRouter.post("/", createLead);
