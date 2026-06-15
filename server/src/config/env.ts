import "dotenv/config";

const parsedPort = Number(process.env.PORT ?? 5000);

export const env = {
  port: Number.isNaN(parsedPort) ? 5000 : parsedPort,
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI,
};
