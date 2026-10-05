import { config } from "../config.js";

export function getHealth(req, res) {
  res.json({
    status: "ok",
    service: "drivework-ai-spike-backend",
    defaultProvider: config.defaultProvider,
    timestamp: new Date().toISOString()
  });
}
