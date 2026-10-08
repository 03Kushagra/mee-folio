// Vercel serverless function: every /api/* request is rewritten here (see vercel.json)
// and handled by the same Express app that runs locally. server/dist is built by `npm run build`.
import { handler } from "../server/dist/config/serverless.js";

export default handler;
