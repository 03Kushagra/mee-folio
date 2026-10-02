import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Project } from "../models/project.model.js";

function isValidProjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function hasRequiredProjectFields(body: unknown): body is {
  description: string;
  title: string;
} {
  if (!body || typeof body !== "object") {
    return false;
  }

  const project = body as Record<string, unknown>;

  return (
    typeof project.title === "string" &&
    project.title.trim().length > 0 &&
    typeof project.description === "string" &&
    project.description.trim().length > 0
  );
}

function hasValidImageFields(body: unknown) {
  if (!body || typeof body !== "object") {
    return false;
  }

  const project = body as Record<string, unknown>;
  const featuredImageUrl = project.featuredImageUrl;
  const legacyImageUrl = project.imageUrl;
  const imageUrls = project.imageUrls;

  const hasValidFeaturedImage =
    featuredImageUrl === undefined || typeof featuredImageUrl === "string";
  const hasValidLegacyImage =
    legacyImageUrl === undefined || typeof legacyImageUrl === "string";
  const hasValidImages =
    imageUrls === undefined ||
    (Array.isArray(imageUrls) &&
      imageUrls.every((imageUrl) => typeof imageUrl === "string"));

  if (!hasValidFeaturedImage || !hasValidLegacyImage || !hasValidImages) {
    return false;
  }

  const featuredCount =
    typeof featuredImageUrl === "string" && featuredImageUrl.trim().length > 0
      ? 1
      : typeof legacyImageUrl === "string" && legacyImageUrl.trim().length > 0
        ? 1
        : 0;
  const extraImageCount = Array.isArray(imageUrls)
    ? imageUrls.filter((imageUrl) => imageUrl.trim().length > 0).length
    : 0;

  return featuredCount + extraImageCount <= 6;
}

export async function getProjects(_request: Request, response: Response) {
  try {
    const projects = await Project.find().sort({ order: 1, createdAt: -1 });

    response.json({
      data: projects,
    });
  } catch (error) {
    response.status(500).json({
      message: "Failed to fetch projects",
      error: getErrorMessage(error),
    });
  }
}

export async function getProjectById(request: Request, response: Response) {
  const id = getParamValue(request.params.id);

  if (!isValidProjectId(id)) {
    response.status(400).json({
      message: "Invalid project id",
    });
    return;
  }

  try {
    const project = await Project.findById(id);

    if (!project) {
      response.status(404).json({
        message: "Project not found",
      });
      return;
    }

    response.json({
      data: project,
    });
  } catch (error) {
    response.status(500).json({
      message: "Failed to fetch project",
      error: getErrorMessage(error),
    });
  }
}

export async function createProject(request: Request, response: Response) {
  if (!hasRequiredProjectFields(request.body)) {
    response.status(400).json({
      message: "title and description are required",
    });
    return;
  }

  if (!hasValidImageFields(request.body)) {
    response.status(400).json({
      message:
        "featuredImageUrl/imageUrl must be strings and imageUrls must contain at most 5 additional image URLs.",
    });
    return;
  }

  try {
    const project = await Project.create(request.body);

    response.status(201).json({
      data: project,
      message: "Project created",
    });
  } catch (error) {
    response.status(400).json({
      message: "Failed to create project",
      error: getErrorMessage(error),
    });
  }
}

export async function updateProject(request: Request, response: Response) {
  const id = getParamValue(request.params.id);

  if (!isValidProjectId(id)) {
    response.status(400).json({
      message: "Invalid project id",
    });
    return;
  }

  if (!hasRequiredProjectFields(request.body)) {
    response.status(400).json({
      message: "title and description are required",
    });
    return;
  }

  if (!hasValidImageFields(request.body)) {
    response.status(400).json({
      message:
        "featuredImageUrl/imageUrl must be strings and imageUrls must contain at most 5 additional image URLs.",
    });
    return;
  }

  try {
    const project = await Project.findByIdAndUpdate(id, request.body, {
      new: true,
      runValidators: true,
    });

    if (!project) {
      response.status(404).json({
        message: "Project not found",
      });
      return;
    }

    response.json({
      data: project,
      message: "Project updated",
    });
  } catch (error) {
    response.status(400).json({
      message: "Failed to update project",
      error: getErrorMessage(error),
    });
  }
}

export async function deleteProject(request: Request, response: Response) {
  const id = getParamValue(request.params.id);

  if (!isValidProjectId(id)) {
    response.status(400).json({
      message: "Invalid project id",
    });
    return;
  }

  try {
    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      response.status(404).json({
        message: "Project not found",
      });
      return;
    }

    response.json({
      data: project,
      message: "Project deleted",
    });
  } catch (error) {
    response.status(500).json({
      message: "Failed to delete project",
      error: getErrorMessage(error),
    });
  }
}
