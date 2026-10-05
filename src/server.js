import fs from "node:fs";
import { config } from "./config.js";
import { createApp } from "./app.js";

fs.mkdirSync(config.uploadsDir, { recursive: true });
fs.mkdirSync(config.outputsDir, { recursive: true });

const app = createApp();

app.listen(config.port, (error) => {
  if (error) {
    console.error(`Failed to start backend on port ${config.port}:`, error.message);
    process.exit(1);
  }
  console.log(`drivework-ai-spike-backend listening on http://localhost:${config.port}`);
  console.log(`Default provider: ${config.defaultProvider} | CORS origins: ${config.corsOrigins.join(", ")}`);
});
