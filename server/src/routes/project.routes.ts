import { Router } from "express";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  updateProject,
} from "../controllers/project.controller.js";
import { requireAdmin } from "../lib/auth.js";

export const projectRouter = Router();

projectRouter.get("/", getProjects);
projectRouter.get("/:id", getProjectById);
// Changes need the admin login.
projectRouter.post("/", requireAdmin, createProject);
projectRouter.put("/:id", requireAdmin, updateProject);
projectRouter.delete("/:id", requireAdmin, deleteProject);
