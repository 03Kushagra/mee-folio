import "dotenv/config";

const parsedPort = Number(process.env.PORT ?? 5000);

export const env = {
  port: Number.isNaN(parsedPort) ? 5000 : parsedPort,
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  mongoUri: process.env.MONGO_URI ?? process.env.MONGODB_URI,
  // Password for the /admin page. Leave empty to keep the admin page locked.
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
};
