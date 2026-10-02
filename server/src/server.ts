import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

async function startServer() {
  await connectDB();

  app.listen(env.port, () => {
    console.log(`API running at http://localhost:${env.port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Unable to start the server:", error);
  process.exit(1);
});
