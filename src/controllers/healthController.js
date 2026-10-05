import { config } from "../config.js";

export function getHealth(req, res) {
  res.json({
    status: "ok",
    service: "drivework-ai-spike-backend",
    defaultProvider: config.defaultProvider,
    runtime: config.isVercel ? "vercel" : "local",
    timestamp: new Date().toISOString()
  });
}
