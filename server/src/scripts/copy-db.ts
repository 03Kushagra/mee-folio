/**
 * Copies your site content from one MongoDB to another — e.g. from the local database
 * (MONGODB_URI in server/.env) up to MongoDB Atlas used by the live site.
 *
 *   npm run db:copy --workspace server -- "mongodb+srv://user:pass@cluster.../mee-folio"
 *
 * Copies the profile, projects and leads collections. Documents are matched by _id:
 * existing ones are replaced, new ones added, nothing on the target is deleted.
 */
import mongoose from "mongoose";
import { env } from "../config/env.js";

const target = process.argv[2];
const COLLECTIONS = ["profile", "projects", "leads"];

if (!env.mongoUri || !target) {
  console.error('Usage: npm run db:copy --workspace server -- "<target MongoDB URI>"  (source = MONGODB_URI in server/.env)');
  process.exit(1);
}
if (target === env.mongoUri) {
  console.error("Source and target are the same database.");
  process.exit(1);
}

const source = await mongoose.createConnection(env.mongoUri).asPromise();
const destination = await mongoose.createConnection(target).asPromise();
try {
  for (const name of COLLECTIONS) {
    const docs = await source.collection(name).find().toArray();
    if (docs.length === 0) {
      console.log(`${name}: nothing to copy`);
      continue;
    }
    if (name === "profile") {
      // Only one profile (key "main") may exist: drop a different one on the target first.
      await destination.collection(name).deleteMany({ _id: { $nin: docs.map((doc) => doc._id) }, key: { $in: docs.map((doc) => doc.key) } });
    }
    const result = await destination.collection(name).bulkWrite(
      docs.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } })),
    );
    console.log(`${name}: ${docs.length} copied (${result.upsertedCount} new, ${result.modifiedCount} updated)`);
  }
  console.log(`Done → ${destination.name}`);
} finally {
  await source.close();
  await destination.close();
}
