const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const config = require('../config');
const HttpError = require('../utils/httpError');
const logger = require('../utils/logger');
const {
  createUniqueFileName,
  createUploadId,
  ensureDirectory,
  pathExists,
  removeDirectorySafe,
  sanitizeFileName,
} = require('../utils/fileHelpers');
const { validateFileMetadata } = require('../utils/validation');
const { saveFileFromPath } = require('./fileService');

const metadataFileName = 'metadata.json';

function getUploadDir(uploadId) {
  return path.join(config.storage.chunkDir, uploadId);
}

function getChunkPath(uploadId, chunkIndex) {
  return path.join(getUploadDir(uploadId), `${chunkIndex}.part`);
}

function getMetadataPath(uploadId) {
  return path.join(getUploadDir(uploadId), metadataFileName);
}

async function readMetadata(uploadId) {
  const metadataPath = getMetadataPath(uploadId);

  if (!(await pathExists(metadataPath))) {
    throw new HttpError(404, 'Upload task was not found or has expired.');
  }

  const rawMetadata = await fsp.readFile(metadataPath, 'utf8');
  return JSON.parse(rawMetadata);
}

async function writeMetadata(uploadId, metadata) {
  await fsp.writeFile(getMetadataPath(uploadId), JSON.stringify(metadata, null, 2));
}

async function listUploadedChunks(uploadId) {
  const uploadDir = getUploadDir(uploadId);

  if (!(await pathExists(uploadDir))) {
    return [];
  }

  const fileNames = await fsp.readdir(uploadDir);

  return fileNames
    .filter((fileName) => fileName.endsWith('.part'))
    .map((fileName) => Number(fileName.replace('.part', '')))
    .filter((index) => Number.isInteger(index))
    .sort((a, b) => a - b);
}

async function findReusableUploadTask({ originalName, mimeType, fileSize, totalChunks, chunkSize }) {
  if (!(await pathExists(config.storage.chunkDir))) {
    return null;
  }

  const entries = await fsp.readdir(config.storage.chunkDir, { withFileTypes: true });
  const now = Date.now();
  let reusableTask = null;

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const uploadId = entry.name;
    const metadataPath = getMetadataPath(uploadId);

    if (!(await pathExists(metadataPath))) {
      continue;
    }

    try {
      const metadata = JSON.parse(await fsp.readFile(metadataPath, 'utf8'));
      const updatedAt = new Date(metadata.updatedAt || metadata.createdAt).getTime();
      const isExpired = Number.isFinite(updatedAt) && now - updatedAt > config.cleanup.chunkExpiryMs;

      if (
        metadata.status === 'uploading' &&
        !isExpired &&
        metadata.originalName === originalName &&
        metadata.mimeType === mimeType &&
        Number(metadata.fileSize) === fileSize &&
        Number(metadata.totalChunks) === totalChunks &&
        Number(metadata.chunkSize) === chunkSize
      ) {
        const candidate = {
          metadata,
          uploadedChunks: await listUploadedChunks(uploadId),
        };

        if (!reusableTask || candidate.uploadedChunks.length > reusableTask.uploadedChunks.length) {
          reusableTask = candidate;
        }
      }
    } catch (error) {
      logger.warn('Skipping invalid chunk upload metadata', {
        uploadId,
        message: error.message,
      });
    }
  }

  return reusableTask;
}

async function initChunkUpload(payload) {
  const originalName = sanitizeFileName(payload.fileName);
  const mimeType = payload.mimeType;
  const fileSize = Number(payload.fileSize);
  const totalChunks = Number(payload.totalChunks);
  const chunkSize = Number(payload.chunkSize || config.upload.defaultChunkSizeBytes);

  if (!originalName || !mimeType || !Number.isFinite(fileSize) || fileSize <= 0) {
    throw new HttpError(400, 'fileName, mimeType and a positive fileSize are required.');
  }

  if (!Number.isInteger(totalChunks) || totalChunks <= 0) {
    throw new HttpError(400, 'totalChunks must be a positive integer.');
  }

  if (!Number.isInteger(chunkSize) || chunkSize <= 0 || chunkSize > config.upload.maxChunkSizeBytes) {
    throw new HttpError(400, 'chunkSize must be a positive integer within the configured limit.', {
      maxChunkSizeBytes: config.upload.maxChunkSizeBytes,
    });
  }

  validateFileMetadata({
    originalName,
    mimeType,
    size: fileSize,
    maxSizeBytes: config.upload.maxChunkUploadFileSizeBytes,
  });

  const reusableTask = await findReusableUploadTask({
    originalName,
    mimeType,
    fileSize,
    totalChunks,
    chunkSize,
  });

  if (reusableTask) {
    logger.info('Reusing existing chunk upload task', {
      uploadId: reusableTask.metadata.uploadId,
      originalName,
      uploadedCount: reusableTask.uploadedChunks.length,
      totalChunks,
    });

    return {
      uploadId: reusableTask.metadata.uploadId,
      uploadedChunks: reusableTask.uploadedChunks,
      expiresInMs: config.cleanup.chunkExpiryMs,
      recommendedChunkSize: config.upload.defaultChunkSizeBytes,
      resumed: true,
    };
  }

  const uploadId = createUploadId();
  const uploadDir = getUploadDir(uploadId);

  await ensureDirectory(uploadDir);

  const metadata = {
    uploadId,
    originalName,
    mimeType,
    fileSize,
    totalChunks,
    chunkSize,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'uploading',
  };

  await writeMetadata(uploadId, metadata);

  logger.info('Initialized chunk upload', { uploadId, originalName, totalChunks });

  return {
    uploadId,
    uploadedChunks: [],
    expiresInMs: config.cleanup.chunkExpiryMs,
    recommendedChunkSize: config.upload.defaultChunkSizeBytes,
  };
}

async function saveChunk({ uploadId, chunkIndex, chunk }) {
  const metadata = await readMetadata(uploadId);

  if (metadata.status !== 'uploading') {
    throw new HttpError(409, 'This upload task is not accepting chunks.');
  }

  if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= metadata.totalChunks) {
    throw new HttpError(400, 'chunkIndex is outside the expected range.');
  }

  if (chunk.size > config.upload.maxChunkSizeBytes) {
    throw new HttpError(413, 'Chunk size exceeds the configured limit.');
  }

  const expectedStart = chunkIndex * metadata.chunkSize;
  const expectedSize = Math.min(metadata.chunkSize, metadata.fileSize - expectedStart);

  if (chunk.size !== expectedSize) {
    throw new HttpError(400, 'Chunk size does not match the expected range.', {
      chunkIndex,
      expectedSize,
      actualSize: chunk.size,
    });
  }

  await ensureDirectory(getUploadDir(uploadId));
  await fsp.writeFile(getChunkPath(uploadId, chunkIndex), chunk.buffer);

  const uploadedChunks = await listUploadedChunks(uploadId);

  metadata.updatedAt = new Date().toISOString();
  await writeMetadata(uploadId, metadata);

  logger.info('Saved upload chunk', {
    uploadId,
    chunkIndex,
    uploadedCount: uploadedChunks.length,
    totalChunks: metadata.totalChunks,
  });

  return {
    uploadId,
    chunkIndex,
    uploadedChunks,
    receivedChunks: uploadedChunks.length,
    totalChunks: metadata.totalChunks,
  };
}

async function getUploadStatus(uploadId) {
  const metadata = await readMetadata(uploadId);
  const uploadedChunks = await listUploadedChunks(uploadId);

  return {
    uploadId,
    status: metadata.status,
    originalName: metadata.originalName,
    totalChunks: metadata.totalChunks,
    uploadedChunks,
    missingChunks: Array.from({ length: metadata.totalChunks }, (_, index) => index).filter(
      (index) => !uploadedChunks.includes(index),
    ),
  };
}

async function mergeChunks(uploadId, options = {}) {
  const metadata = await readMetadata(uploadId);
  const uploadedChunks = await listUploadedChunks(uploadId);

  if (uploadedChunks.length !== metadata.totalChunks) {
    throw new HttpError(409, 'Cannot merge until every chunk has been uploaded.', {
      receivedChunks: uploadedChunks.length,
      totalChunks: metadata.totalChunks,
      missingChunks: Array.from({ length: metadata.totalChunks }, (_, index) => index).filter(
        (index) => !uploadedChunks.includes(index),
      ),
    });
  }

  await ensureDirectory(config.storage.uploadDir);

  const storedFileName = createUniqueFileName(metadata.originalName);
  const finalPath = path.join(config.storage.uploadDir, storedFileName);
  const writeStream = fs.createWriteStream(finalPath);

  try {
    // Chunks are merged in numeric order so parallel uploads still produce the
    // exact original file. Production systems can replace this step with cloud
    // multipart completion APIs.
    for (let index = 0; index < metadata.totalChunks; index += 1) {
      const chunkPath = getChunkPath(uploadId, index);
      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.on('error', reject);
        readStream.on('end', resolve);
        readStream.pipe(writeStream, { end: false });
      });
    }

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      writeStream.end();
    });

    const finalStats = await fsp.stat(finalPath);

    if (finalStats.size !== metadata.fileSize) {
      await fsp.rm(finalPath, { force: true });
      throw new HttpError(500, 'Merged file size does not match the original file size.', {
        expectedSize: metadata.fileSize,
        actualSize: finalStats.size,
      });
    }

    metadata.status = 'merged';
    metadata.updatedAt = new Date().toISOString();
    await writeMetadata(uploadId, metadata);
    await removeDirectorySafe(getUploadDir(uploadId));

    logger.info('Merged chunk upload successfully', { uploadId, storedFileName });

    return saveFileFromPath({
      uploadId,
      originalName: metadata.originalName,
      storedFileName,
      mimeType: metadata.mimeType,
      size: finalStats.size,
      sourcePath: finalPath,
    }, options);
  } catch (error) {
    writeStream.destroy();
    throw error;
  }
}

// Extension points for production projects:
// - Replace local disk writes with AWS S3 multipart upload or another object storage provider.
// - Add userId or tenantId to the metadata to isolate uploads by customer account.
// - Add permission checks before status lookup, chunk upload, merge and public access.
// - Persist metadata in Redis/PostgreSQL when upload state must survive multi-server deployments.

module.exports = {
  getUploadStatus,
  initChunkUpload,
  listUploadedChunks,
  mergeChunks,
  saveChunk,
};
