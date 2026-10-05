import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { config } from "../config.js";
import { PART_REFERENCE_FIELD, VIEWS } from "../constants.js";
import { HttpError } from "./httpError.js";

const EXTENSION_BY_MIME_TYPE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

// Each run gets its own folder: uploads/<runId>/<field>.<ext>
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(config.uploadsDir, req.runId);
    fs.mkdir(dir, { recursive: true }, (error) => cb(error, dir));
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}${EXTENSION_BY_MIME_TYPE[file.mimetype]}`);
  }
});

export const spikeUpload = multer({
  storage,
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024,
    files: VIEWS.length + 1
  },
  fileFilter: (req, file, cb) => {
    if (EXTENSION_BY_MIME_TYPE[file.mimetype]) {
      cb(null, true);
      return;
    }
    cb(new HttpError(400, `"${file.fieldname}" must be a JPEG, PNG or WebP image (received ${file.mimetype}).`));
  }
}).fields([
  ...VIEWS.map((view) => ({ name: view.key, maxCount: 1 })),
  { name: PART_REFERENCE_FIELD, maxCount: 1 }
]);

export function uploadUrl(runId, filePath) {
  return `/uploads/${runId}/${path.basename(filePath)}`;
}

export function outputUrl(runId, filePath) {
  return `/outputs/${runId}/${path.basename(filePath)}`;
}

export async function removeRunUploads(runId) {
  if (!runId) return;
  await fs.promises.rm(path.join(config.uploadsDir, runId), { recursive: true, force: true });
}
