const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

function normalizeExtension(fileName) {
  return path.extname(fileName || '').toLowerCase();
}

function createRandomString(length = 10) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

function createUniqueFileName(originalName) {
  const extension = normalizeExtension(originalName);
  const timestamp = Date.now();
  const randomPart = createRandomString(12);

  return `${timestamp}-${randomPart}${extension}`;
}

function createUploadId() {
  return `${Date.now()}-${createRandomString(18)}`;
}

function sanitizeFileName(fileName) {
  return path.basename(fileName || 'uploaded-file').replace(/[^\w.\-() ]/g, '_');
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function removeDirectorySafe(directoryPath) {
  await fs.rm(directoryPath, { recursive: true, force: true });
}

module.exports = {
  createUploadId,
  createUniqueFileName,
  ensureDirectory,
  normalizeExtension,
  pathExists,
  removeDirectorySafe,
  sanitizeFileName,
};
