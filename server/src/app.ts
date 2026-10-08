import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { leadRouter } from "./routes/lead.routes.js";
import { profileRouter } from "./routes/profile.routes.js";
import { projectRouter } from "./routes/project.routes.js";

export const app = express();

// Behind a host's proxy (Vercel, Render…), read the visitor's real IP for rate limiting.
app.set("trust proxy", 1);

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
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/projects", projectRouter);
app.use("/api/leads", leadRouter);
