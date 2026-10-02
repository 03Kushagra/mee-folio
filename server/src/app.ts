import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.routes.js";
import { leadRouter } from "./routes/lead.routes.js";
import { projectRouter } from "./routes/project.routes.js";

export const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
  }),
);
app.use(express.json({ limit: "8mb" }));

app.get("/", (_request, response) => {
  response.json({
    message: "Mee-folio API",
  });
});

app.use("/api/health", healthRouter);
app.use("/api/projects", projectRouter);
app.use("/api/leads", leadRouter);
