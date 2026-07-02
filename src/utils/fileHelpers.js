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

function restoreUtf8FileName(fileName) {
  const value = String(fileName || 'uploaded-file');

  if (!/[\u0080-\u009f]/.test(value)) {
    return value;
  }

  const decodedValue = Buffer.from(value, 'latin1').toString('utf8');

  return decodedValue.includes('\uFFFD') ? value : decodedValue;
}

function sanitizeFileName(fileName) {
  const baseName = path.basename(restoreUtf8FileName(fileName));
  const sanitizedName = baseName
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]/g, '')
    .trim();

  return sanitizedName || 'uploaded-file';
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
  createRandomString,
  createUniqueFileName,
  ensureDirectory,
  normalizeExtension,
  pathExists,
  removeDirectorySafe,
  sanitizeFileName,
};
