/**
 * Loads project content from docs/project-content.json into MongoDB.
 *
 *   npm run projects:import --workspace server
 *
 * Each entry's "match" is looked up in the existing project titles (case-insensitive):
 * one match → that project is updated, none → a new project is created,
 * several → it is skipped so nothing gets overwritten by mistake.
 * After this, keep editing in /admin; the JSON file is only a starting point.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Project } from "../models/project.model.js";

type Entry = Record<string, unknown> & { match: string; title: string };

const file = fileURLToPath(new URL("../../../docs/project-content.json", import.meta.url));
const entries = JSON.parse(readFileSync(file, "utf8")) as Entry[];

if (!env.mongoUri) {
  console.error("MONGO_URI / MONGODB_URI is not set in server/.env");
  process.exit(1);
}

await mongoose.connect(env.mongoUri);
try {
  for (const { match, ...fields } of entries) {
    const found = await Project.find({ title: { $regex: match, $options: "i" } });
    if (found.length > 1) {
      console.warn(`Skipped "${fields.title}": ${found.length} projects match /${match}/ (${found.map((p) => p.title).join(", ")}).`);
      continue;
    }
    if (found.length === 1) {
      await Project.findByIdAndUpdate(found[0]._id, { $set: fields }, { runValidators: true });
      console.log(`Updated "${found[0].title}" → "${fields.title}"`);
    } else {
      await Project.create(fields);
      console.log(`Created "${fields.title}"`);
    }
  }
} finally {
  await mongoose.disconnect();
}
