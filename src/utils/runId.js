import crypto from "node:crypto";

// e.g. run_20261005T101530_a1b2c3 - sortable and safe to use as a folder name.
export function createRunId(date = new Date()) {
  const stamp = date.toISOString().replace(/[-:]/g, "").slice(0, 15);
  return `run_${stamp}_${crypto.randomBytes(3).toString("hex")}`;
}

export function assignRunId(req, res, next) {
  req.runId = createRunId();
  next();
}
