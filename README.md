# Mee-folio

A minimal personal website skeleton with a React and TypeScript client, a Node.js and Express API, and MongoDB support.

## Structure

```text
client/   React + Vite frontend
server/   Express + MongoDB backend
```

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `server/.env.example` to `server/.env`.

3. Start the client and server:

   ```bash
   npm run dev
   ```

The site runs at `http://localhost:5173` and the API runs at `http://localhost:5000`.

MongoDB is optional for the initial skeleton. Add `MONGODB_URI` when database-backed features are introduced.

