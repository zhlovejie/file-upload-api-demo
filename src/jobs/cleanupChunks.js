const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { ensureDirectory, removeDirectorySafe } = require('../utils/fileHelpers');

async function cleanupExpiredChunks() {
  await ensureDirectory(config.storage.chunkDir);

  const uploadDirectories = await fs.readdir(config.storage.chunkDir, { withFileTypes: true });
  const now = Date.now();
  let removedCount = 0;

  for (const entry of uploadDirectories) {
    if (!entry.isDirectory()) {
      continue;
    }

    const uploadDir = path.join(config.storage.chunkDir, entry.name);
    const metadataPath = path.join(uploadDir, 'metadata.json');

    try {
      const metadataRaw = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataRaw);
      const updatedAt = new Date(metadata.updatedAt || metadata.createdAt).getTime();
      const isExpired = now - updatedAt > config.cleanup.chunkExpiryMs;

      if (metadata.status !== 'merged' && isExpired) {
        await removeDirectorySafe(uploadDir);
        removedCount += 1;
      }
    } catch (error) {
      const stats = await fs.stat(uploadDir);

      if (now - stats.mtimeMs > config.cleanup.chunkExpiryMs) {
        await removeDirectorySafe(uploadDir);
        removedCount += 1;
      }
    }
  }

  if (removedCount > 0) {
    logger.info('Expired chunk folders were removed', { removedCount });
  }

  return removedCount;
}

function startChunkCleanupJob() {
  cleanupExpiredChunks().catch((error) => {
    logger.error('Initial chunk cleanup failed', { message: error.message });
  });

  const timer = setInterval(() => {
    cleanupExpiredChunks().catch((error) => {
      logger.error('Scheduled chunk cleanup failed', { message: error.message });
    });
  }, config.cleanup.cleanupIntervalMs);

  timer.unref();

  logger.info('Chunk cleanup job started', {
    intervalMs: config.cleanup.cleanupIntervalMs,
    expiryMs: config.cleanup.chunkExpiryMs,
  });
}

module.exports = {
  cleanupExpiredChunks,
  startChunkCleanupJob,
};
