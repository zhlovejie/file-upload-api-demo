const path = require('path');

const rootDir = path.resolve(__dirname, '../..');

const config = {
  app: {
    port: Number(process.env.PORT || 4000),
    publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:4000',
  },
  storage: {
    uploadDir: process.env.UPLOAD_DIR || path.join(rootDir, 'storage', 'uploads'),
    chunkDir: process.env.CHUNK_DIR || path.join(rootDir, 'storage', 'chunks'),
    publicRoute: '/static',
  },
  upload: {
    maxSingleFileSizeBytes: Number(process.env.MAX_SINGLE_FILE_SIZE_BYTES || 100 * 1024 * 1024),
    maxChunkUploadFileSizeBytes: Number(
      process.env.MAX_CHUNK_UPLOAD_FILE_SIZE_BYTES || 5 * 1024 * 1024 * 1024,
    ),
    maxChunkSizeBytes: Number(process.env.MAX_CHUNK_SIZE_BYTES || 5 * 1024 * 1024),
    defaultChunkSizeBytes: Number(process.env.DEFAULT_CHUNK_SIZE_BYTES || 2 * 1024 * 1024),
    allowedExtensions: [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.mp4',
      '.mov',
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.txt',
      '.csv',
      '.zip',
    ],
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-zip-compressed',
    ],
  },
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '*')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  cleanup: {
    chunkExpiryMs: Number(process.env.CHUNK_EXPIRY_MS || 24 * 60 * 60 * 1000),
    cleanupIntervalMs: Number(process.env.CLEANUP_INTERVAL_MS || 30 * 60 * 1000),
  },
  logging: {
    requestFormat: process.env.LOG_FORMAT || 'dev',
  },
};

module.exports = config;
