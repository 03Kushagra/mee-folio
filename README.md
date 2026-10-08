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

2. Copy `server/.env.example` to `server/.env`, set `MONGODB_URI` and choose an `ADMIN_PASSWORD`.

3. Start the client and server:

   ```bash
   npm run dev
   ```

The site runs at `http://localhost:5173` and the API runs at `http://localhost:5000`.

MongoDB is required: all site content (about, hero roles, AI work, experience, education, certifications, projects) is loaded from it.

## Editing content

Open `http://localhost:5173/admin` and log in with `ADMIN_PASSWORD`. Every section of the site can be edited there; nothing personal is stored in the code.

To start from example content instead of empty forms (only runs if no content exists yet):

```bash
npm run seed:profile --workspace server
```

Images and the resume are referenced by URL: put files in `client/public/` (e.g. `/images/me.jpg`, `/resume.pdf`) or paste any link.


## Deploying (Vercel)

`vercel.json` deploys the whole repo as one Vercel project: the client is served as a static site
and the Express API runs as a serverless function (`api/index.mjs`). Any path that isn't a file
(like `/admin`) falls back to `index.html`.

1. In Vercel → Project → Settings → General, leave **Root Directory** empty (the repo root).
2. In Settings → Environment Variables add `MONGODB_URI` (a MongoDB Atlas connection string; the
   live site can't reach the database on your computer) and `ADMIN_PASSWORD` (no quotes needed there).
   In Atlas → Network Access, allow `0.0.0.0/0`.
3. Copy your local content up to Atlas once:

   ```bash
   npm run db:copy --workspace server -- "mongodb+srv://user:pass@cluster.mongodb.net/mee-folio"
   ```

4. Redeploy. After that, edit content at `https://<your-site>/admin`; it saves straight to Atlas.
