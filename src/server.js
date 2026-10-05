// Local development entrypoint only. On Vercel, src/app.js (default export) is used instead
// and Vercel provides the HTTP server, so app.listen() is never called there.
import app from "./app.js";
import { config } from "./config.js";

app.listen(config.port, (error) => {
  if (error) {
    console.error(`Failed to start backend on port ${config.port}:`, error.message);
    process.exit(1);
  }
  console.log(`drivework-ai-spike-backend listening on http://localhost:${config.port}`);
  console.log(`Default provider: ${config.defaultProvider} | CORS origins: ${config.corsOrigins.join(", ")}`);
});
