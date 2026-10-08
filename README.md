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

