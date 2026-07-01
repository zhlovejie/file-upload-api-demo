const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const {
  createUniqueFileName,
  ensureDirectory,
  sanitizeFileName,
} = require('../utils/fileHelpers');

function buildPublicUrl(fileName) {
  return `${config.app.publicBaseUrl}${config.storage.publicRoute}/${encodeURIComponent(fileName)}`;
}

async function saveSingleFile(file) {
  await ensureDirectory(config.storage.uploadDir);

  const storedFileName = createUniqueFileName(file.originalname);
  const destinationPath = path.join(config.storage.uploadDir, storedFileName);

  // Extension point: replace this local write with AWS S3, Cloudflare R2,
  // Google Cloud Storage or Azure Blob Storage in a client production system.
  await fs.writeFile(destinationPath, file.buffer);

  return {
    originalName: sanitizeFileName(file.originalname),
    storedFileName,
    mimeType: file.mimetype,
    size: file.size,
    publicUrl: buildPublicUrl(storedFileName),
  };
}

module.exports = {
  buildPublicUrl,
  saveSingleFile,
};
