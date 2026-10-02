/**
 * Moves a project to the end of the projects list on the site.
 *
 * Usage (from the repo root):
 *   npm run projects:move-last --workspace server -- "Hayday"
 *
 * Matches the title case-insensitively (a partial title works too) and sets its
 * `order` to one more than the current highest, so it sorts after every other project.
 */
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Project } from "../models/project.model.js";

const search = process.argv.slice(2).join(" ").trim();

if (!search) {
  console.error('Give part of the project title, e.g. npm run projects:move-last --workspace server -- "Hayday"');
  process.exit(1);
}

if (!env.mongoUri) {
  console.error("MONGO_URI is not set in server/.env.");
  process.exit(1);
}

const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

await mongoose.connect(env.mongoUri);

try {
  const matches = await Project.find({ title: { $regex: escaped, $options: "i" } });

  if (matches.length === 0) {
    console.error(`No project title contains "${search}".`);
    process.exitCode = 1;
  } else if (matches.length > 1) {
    console.error(`"${search}" matches more than one project — be more specific:`);
    for (const match of matches) console.error(`  - ${match.title}`);
    process.exitCode = 1;
  } else {
    const [project] = matches;
    const highest = await Project.findOne({ _id: { $ne: project._id } }).sort({ order: -1 });
    const order = (highest?.order ?? 0) + 1;
    await Project.updateOne({ _id: project._id }, { $set: { order } });
    console.log(`Moved "${project.title}" to the end (order = ${order}).`);
  }
} finally {
  await mongoose.disconnect();
}
