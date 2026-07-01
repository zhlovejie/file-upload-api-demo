# file-upload-api-demo Deliverables

## 1. Complete Project Folder Structure

```text
file-upload-api-demo/
|-- .gitignore
|-- package-lock.json
|-- package.json
|-- README.md
|-- public/
|   `-- index.html
|-- src/
|   |-- app.js
|   |-- config/
|   |   `-- index.js
|   |-- controllers/
|   |   `-- uploadController.js
|   |-- jobs/
|   |   `-- cleanupChunks.js
|   |-- middleware/
|   |   |-- errorHandler.js
|   |   |-- response.js
|   |   `-- upload.js
|   |-- routes/
|   |   `-- uploadRoutes.js
|   |-- services/
|   |   |-- chunkService.js
|   |   `-- fileService.js
|   `-- utils/
|       |-- asyncHandler.js
|       |-- fileHelpers.js
|       |-- httpError.js
|       |-- logger.js
|       `-- validation.js
`-- storage/
    |-- chunks/
    |   `-- .gitkeep
    `-- uploads/
        `-- .gitkeep
```

## 2. Full Source Code of All Backend Files

### src/app.js

```js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const uploadRoutes = require('./routes/uploadRoutes');
const responseMiddleware = require('./middleware/response');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const HttpError = require('./utils/httpError');
const { ensureDirectory } = require('./utils/fileHelpers');
const { startChunkCleanupJob } = require('./jobs/cleanupChunks');

const app = express();

function createCorsOptions() {
  const allowsEveryOrigin = config.cors.allowedOrigins.includes('*');

  return {
    origin(origin, callback) {
      if (allowsEveryOrigin || !origin || config.cors.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new HttpError(403, 'Origin is not allowed by CORS configuration.'));
    },
    credentials: true,
    exposedHeaders: ['Content-Length', 'Content-Type'],
  };
}

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  }),
);
app.use(cors(createCorsOptions()));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.logging.requestFormat));
app.use(responseMiddleware);

app.get('/health', (req, res) => {
  res.success({ uptime: process.uptime() }, 'File upload service is healthy.');
});

app.use('/api/uploads', uploadRoutes);

// Static files are exposed separately from API routes so this service can be
// integrated as an independent asset host for existing frontend applications.
app.use(
  config.storage.publicRoute,
  express.static(config.storage.uploadDir, {
    fallthrough: false,
    maxAge: '7d',
    immutable: true,
    setHeaders(res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    },
  }),
);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
    error: {
      code: 404,
      details: null,
    },
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

async function bootstrap() {
  // In a production client system these folders can be replaced by mounted
  // volumes, AWS S3, Cloudflare R2, Azure Blob Storage or another object store.
  await ensureDirectory(config.storage.uploadDir);
  await ensureDirectory(config.storage.chunkDir);

  startChunkCleanupJob();

  app.listen(config.app.port, () => {
    logger.info('File upload API demo is running', {
      port: config.app.port,
      apiBaseUrl: `${config.app.publicBaseUrl}/api/uploads`,
      staticBaseUrl: `${config.app.publicBaseUrl}${config.storage.publicRoute}`,
      frontendUrl: `${config.app.publicBaseUrl}/index.html`,
    });
  });
}

bootstrap().catch((error) => {
  logger.error('Application failed to start', { message: error.message, stack: error.stack });
  process.exit(1);
});

module.exports = app;
```

### src/config/index.js

```js
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
    maxSingleFileSizeBytes: Number(process.env.MAX_SINGLE_FILE_SIZE_BYTES || 50 * 1024 * 1024),
    maxChunkUploadFileSizeBytes: Number(
      process.env.MAX_CHUNK_UPLOAD_FILE_SIZE_BYTES || 500 * 1024 * 1024,
    ),
    maxChunkSizeBytes: Number(process.env.MAX_CHUNK_SIZE_BYTES || 8 * 1024 * 1024),
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
```

### src/controllers/uploadController.js

```js
const config = require('../config');
const { saveSingleFile } = require('../services/fileService');
const {
  getUploadStatus,
  initChunkUpload,
  mergeChunks,
  saveChunk,
} = require('../services/chunkService');
const { toPositiveInteger } = require('../utils/validation');

async function uploadSingleFile(req, res) {
  const result = await saveSingleFile(req.file);

  res.success(result, 'File uploaded successfully.', 201);
}

async function initLargeFileUpload(req, res) {
  const result = await initChunkUpload(req.body);

  res.success(result, 'Chunk upload task initialized.', 201);
}

async function uploadChunk(req, res) {
  const chunkIndex = toPositiveInteger(req.body.chunkIndex, 'chunkIndex');
  const result = await saveChunk({
    uploadId: req.params.uploadId,
    chunkIndex,
    chunk: req.file,
  });

  res.success(result, 'Chunk uploaded successfully.');
}

async function readLargeFileUploadStatus(req, res) {
  const result = await getUploadStatus(req.params.uploadId);

  res.success(result, 'Upload status loaded successfully.');
}

async function mergeLargeFileChunks(req, res) {
  const result = await mergeChunks(req.params.uploadId);

  res.success(result, 'Chunks merged successfully.');
}

function readUploadConfig(req, res) {
  res.success(
    {
      maxSingleFileSizeBytes: config.upload.maxSingleFileSizeBytes,
      maxChunkUploadFileSizeBytes: config.upload.maxChunkUploadFileSizeBytes,
      maxChunkSizeBytes: config.upload.maxChunkSizeBytes,
      defaultChunkSizeBytes: config.upload.defaultChunkSizeBytes,
      allowedExtensions: config.upload.allowedExtensions,
      allowedMimeTypes: config.upload.allowedMimeTypes,
      publicBaseUrl: config.app.publicBaseUrl,
    },
    'Upload configuration loaded successfully.',
  );
}

module.exports = {
  initLargeFileUpload,
  mergeLargeFileChunks,
  readLargeFileUploadStatus,
  readUploadConfig,
  uploadChunk,
  uploadSingleFile,
};
```

### src/routes/uploadRoutes.js

```js
const express = require('express');
const {
  initLargeFileUpload,
  mergeLargeFileChunks,
  readLargeFileUploadStatus,
  readUploadConfig,
  uploadChunk,
  uploadSingleFile,
} = require('../controllers/uploadController');
const {
  chunkUploadMiddleware,
  singleFileUploadMiddleware,
} = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/config', readUploadConfig);
router.post('/single', singleFileUploadMiddleware, asyncHandler(uploadSingleFile));
router.post('/chunks/init', asyncHandler(initLargeFileUpload));
router.get('/chunks/:uploadId/status', asyncHandler(readLargeFileUploadStatus));
router.post('/chunks/:uploadId/part', chunkUploadMiddleware, asyncHandler(uploadChunk));
router.post('/chunks/:uploadId/merge', asyncHandler(mergeLargeFileChunks));

module.exports = router;
```

### src/services/fileService.js

```js
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
```

### src/services/chunkService.js

```js
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
const { buildPublicUrl } = require('./fileService');

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

async function mergeChunks(uploadId) {
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
      writeStream.end(resolve);
      writeStream.on('error', reject);
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

    return {
      uploadId,
      originalName: metadata.originalName,
      storedFileName,
      mimeType: metadata.mimeType,
      size: finalStats.size,
      publicUrl: buildPublicUrl(storedFileName),
    };
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
```

### src/middleware/response.js

```js
function responseMiddleware(req, res, next) {
  res.success = (data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  };

  next();
}

module.exports = responseMiddleware;
```

### src/middleware/errorHandler.js

```js
const logger = require('../utils/logger');

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || error.status || 500;
  const message = statusCode === 500 ? 'Internal server error.' : error.message;

  logger.error('Request failed', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: error.message,
    stack: statusCode === 500 ? error.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: statusCode,
      details: error.details || null,
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = errorHandler;
```

### src/middleware/upload.js

```js
const multer = require('multer');
const config = require('../config');
const HttpError = require('../utils/httpError');
const { validateFileMetadata } = require('../utils/validation');

const memoryStorage = multer.memoryStorage();

const singleUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: config.upload.maxSingleFileSizeBytes,
  },
}).single('file');

const chunkUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: config.upload.maxChunkSizeBytes,
  },
}).single('chunk');

function parseMulterError(error) {
  if (!error) {
    return null;
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return new HttpError(413, 'The uploaded payload is larger than the allowed limit.');
  }

  return error;
}

function singleFileUploadMiddleware(req, res, next) {
  singleUpload(req, res, (error) => {
    const parsedError = parseMulterError(error);

    if (parsedError) {
      next(parsedError);
      return;
    }

    if (!req.file) {
      next(new HttpError(400, 'A file field named "file" is required.'));
      return;
    }

    validateFileMetadata({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      maxSizeBytes: config.upload.maxSingleFileSizeBytes,
    });

    next();
  });
}

function chunkUploadMiddleware(req, res, next) {
  chunkUpload(req, res, (error) => {
    const parsedError = parseMulterError(error);

    if (parsedError) {
      next(parsedError);
      return;
    }

    if (!req.file) {
      next(new HttpError(400, 'A chunk field named "chunk" is required.'));
      return;
    }

    next();
  });
}

module.exports = {
  chunkUploadMiddleware,
  singleFileUploadMiddleware,
};
```

### src/utils/asyncHandler.js

```js
function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
```

### src/utils/fileHelpers.js

```js
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
```

### src/utils/httpError.js

```js
class HttpError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = HttpError;
```

### src/utils/logger.js

```js
function formatLog(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaText = meta ? ` ${JSON.stringify(meta)}` : '';

  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaText}`;
}

const logger = {
  info(message, meta) {
    console.log(formatLog('info', message, meta));
  },
  warn(message, meta) {
    console.warn(formatLog('warn', message, meta));
  },
  error(message, meta) {
    console.error(formatLog('error', message, meta));
  },
};

module.exports = logger;
```

### src/utils/validation.js

```js
const HttpError = require('./httpError');
const { normalizeExtension } = require('./fileHelpers');
const config = require('../config');

function validateFileMetadata({ originalName, mimeType, size, maxSizeBytes }) {
  const extension = normalizeExtension(originalName);

  if (!config.upload.allowedExtensions.includes(extension)) {
    throw new HttpError(400, 'This file extension is not allowed.', {
      extension,
      allowedExtensions: config.upload.allowedExtensions,
    });
  }

  if (!config.upload.allowedMimeTypes.includes(mimeType)) {
    throw new HttpError(400, 'This MIME type is not allowed.', {
      mimeType,
      allowedMimeTypes: config.upload.allowedMimeTypes,
    });
  }

  if (Number(size) > maxSizeBytes) {
    throw new HttpError(413, 'The uploaded file is larger than the allowed limit.', {
      size,
      maxSizeBytes,
    });
  }
}

function toPositiveInteger(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new HttpError(400, `${fieldName} must be a non-negative integer.`);
  }

  return parsedValue;
}

module.exports = {
  toPositiveInteger,
  validateFileMetadata,
};
```

### src/jobs/cleanupChunks.js

```js
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
```

## 3. Full Source Code of Frontend index.html Demo Page

### public/index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>File Upload API Demo</title>
    <style>
      :root {
        --bg: #f5f7fb;
        --panel: #ffffff;
        --text: #172033;
        --muted: #697386;
        --line: #d9e1ec;
        --primary: #1769aa;
        --primary-dark: #0f4f82;
        --accent: #20a39e;
        --danger: #c62828;
        --success: #16885a;
        --shadow: 0 16px 38px rgba(23, 32, 51, 0.08);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
          sans-serif;
      }

      button,
      input {
        font: inherit;
      }

      .shell {
        width: min(1180px, calc(100% - 32px));
        margin: 0 auto;
        padding: 28px 0 40px;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 20px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .brand-mark {
        display: grid;
        width: 42px;
        height: 42px;
        place-items: center;
        border-radius: 8px;
        background: var(--primary);
        color: #ffffff;
        font-weight: 800;
        letter-spacing: 0;
      }

      h1 {
        margin: 0;
        font-size: clamp(24px, 3vw, 34px);
        letter-spacing: 0;
      }

      .subtitle {
        margin: 3px 0 0;
        color: var(--muted);
      }

      .api-box {
        display: flex;
        align-items: center;
        gap: 8px;
        width: min(460px, 100%);
      }

      .api-box label {
        color: var(--muted);
        white-space: nowrap;
      }

      .api-box input {
        width: 100%;
        height: 38px;
        border: 1px solid var(--line);
        border-radius: 6px;
        padding: 0 11px;
        color: var(--text);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }

      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 8px;
        box-shadow: var(--shadow);
        overflow: hidden;
      }

      .panel-header {
        padding: 18px 20px;
        border-bottom: 1px solid var(--line);
      }

      .panel-header h2 {
        margin: 0;
        font-size: 20px;
        letter-spacing: 0;
      }

      .panel-body {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 20px;
      }

      .drop-zone {
        position: relative;
        display: grid;
        min-height: 168px;
        place-items: center;
        border: 2px dashed #b7c4d6;
        border-radius: 8px;
        background: #f9fbfd;
        transition:
          border-color 160ms ease,
          background 160ms ease;
      }

      .drop-zone.is-active {
        border-color: var(--accent);
        background: #eefaf9;
      }

      .drop-zone input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
      }

      .drop-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 20px;
        text-align: center;
        pointer-events: none;
      }

      .drop-icon {
        display: grid;
        width: 50px;
        height: 50px;
        place-items: center;
        border-radius: 8px;
        background: #e9f2fa;
        color: var(--primary);
        font-size: 24px;
      }

      .drop-title {
        font-weight: 700;
      }

      .drop-note {
        color: var(--muted);
        font-size: 14px;
      }

      .selected-file {
        min-height: 24px;
        color: var(--muted);
      }

      .progress-shell {
        height: 12px;
        overflow: hidden;
        border-radius: 999px;
        background: #e7edf5;
      }

      .progress-bar {
        width: 0%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        transition: width 120ms ease;
      }

      .progress-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--muted);
        font-size: 14px;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .button {
        min-height: 40px;
        border: 0;
        border-radius: 6px;
        padding: 0 15px;
        cursor: pointer;
        color: #ffffff;
        background: var(--primary);
        font-weight: 700;
      }

      .button:hover {
        background: var(--primary-dark);
      }

      .button.secondary {
        color: var(--primary);
        background: #e9f2fa;
      }

      .button.secondary:hover {
        background: #d9eaf7;
      }

      .button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .result {
        display: none;
        gap: 12px;
        padding: 14px;
        border: 1px solid #cce8dc;
        border-radius: 8px;
        background: #f0fbf6;
      }

      .result.is-visible {
        display: grid;
      }

      .result strong {
        color: var(--success);
      }

      .result a {
        color: var(--primary);
        overflow-wrap: anywhere;
        font-weight: 700;
      }

      .preview {
        max-width: 100%;
        max-height: 220px;
        border-radius: 6px;
        border: 1px solid var(--line);
        object-fit: contain;
        background: #ffffff;
      }

      .toast {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 20;
        display: none;
        max-width: min(420px, calc(100% - 40px));
        border-radius: 8px;
        padding: 14px 16px;
        color: #ffffff;
        background: var(--danger);
        box-shadow: var(--shadow);
      }

      .toast.is-visible {
        display: block;
      }

      @media (max-width: 880px) {
        .topbar {
          align-items: flex-start;
          flex-direction: column;
        }

        .grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">FU</div>
          <div>
            <h1>File Upload API Demo</h1>
            <p class="subtitle">Standalone upload service with chunk transfer and static file URLs.</p>
          </div>
        </div>
        <div class="api-box">
          <label for="apiBaseUrl">API Base</label>
          <input id="apiBaseUrl" value="http://localhost:4000" />
        </div>
      </header>

      <section class="grid">
        <article class="panel">
          <div class="panel-header">
            <h2>Normal Single Upload</h2>
          </div>
          <div class="panel-body">
            <label class="drop-zone" id="singleDropZone">
              <input id="singleFileInput" type="file" />
              <span class="drop-content">
                <span class="drop-icon">+</span>
                <span class="drop-title">Select or drop one file</span>
                <span class="drop-note">Images, videos and documents are supported.</span>
              </span>
            </label>
            <div class="selected-file" id="singleSelectedFile">No file selected.</div>
            <div class="progress-shell">
              <div class="progress-bar" id="singleProgressBar"></div>
            </div>
            <div class="progress-row">
              <span id="singleStatusText">Ready</span>
              <span id="singleProgressText">0%</span>
            </div>
            <div class="actions">
              <button class="button" id="singleUploadButton">Upload File</button>
              <button class="button secondary" id="singleResetButton">Reset</button>
            </div>
            <div class="result" id="singleResult"></div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <h2>Large File Chunk Upload</h2>
          </div>
          <div class="panel-body">
            <label class="drop-zone" id="chunkDropZone">
              <input id="chunkFileInput" type="file" />
              <span class="drop-content">
                <span class="drop-icon">↥</span>
                <span class="drop-title">Select or drop a large file</span>
                <span class="drop-note">Chunks are uploaded in parallel with resume status.</span>
              </span>
            </label>
            <div class="selected-file" id="chunkSelectedFile">No file selected.</div>
            <div class="progress-shell">
              <div class="progress-bar" id="chunkProgressBar"></div>
            </div>
            <div class="progress-row">
              <span id="chunkStatusText">Ready</span>
              <span id="chunkProgressText">0%</span>
            </div>
            <div class="actions">
              <button class="button" id="chunkUploadButton">Upload Chunks</button>
              <button class="button secondary" id="chunkResumeButton">Resume Last Task</button>
              <button class="button secondary" id="chunkResetButton">Reset</button>
            </div>
            <div class="result" id="chunkResult"></div>
          </div>
        </article>
      </section>
    </main>

    <div class="toast" id="toast"></div>

    <script>
      const state = {
        singleFile: null,
        chunkFile: null,
        chunkTask: JSON.parse(localStorage.getItem('fileUploadChunkTask') || 'null'),
      };

      const elements = {
        apiBaseUrl: document.getElementById('apiBaseUrl'),
        toast: document.getElementById('toast'),
        singleDropZone: document.getElementById('singleDropZone'),
        singleFileInput: document.getElementById('singleFileInput'),
        singleSelectedFile: document.getElementById('singleSelectedFile'),
        singleProgressBar: document.getElementById('singleProgressBar'),
        singleProgressText: document.getElementById('singleProgressText'),
        singleStatusText: document.getElementById('singleStatusText'),
        singleUploadButton: document.getElementById('singleUploadButton'),
        singleResetButton: document.getElementById('singleResetButton'),
        singleResult: document.getElementById('singleResult'),
        chunkDropZone: document.getElementById('chunkDropZone'),
        chunkFileInput: document.getElementById('chunkFileInput'),
        chunkSelectedFile: document.getElementById('chunkSelectedFile'),
        chunkProgressBar: document.getElementById('chunkProgressBar'),
        chunkProgressText: document.getElementById('chunkProgressText'),
        chunkStatusText: document.getElementById('chunkStatusText'),
        chunkUploadButton: document.getElementById('chunkUploadButton'),
        chunkResumeButton: document.getElementById('chunkResumeButton'),
        chunkResetButton: document.getElementById('chunkResetButton'),
        chunkResult: document.getElementById('chunkResult'),
      };

      function getApiBaseUrl() {
        return elements.apiBaseUrl.value.replace(/\/$/, '');
      }

      function formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex += 1;
        }

        return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
      }

      function setProgress(scope, percent, text) {
        const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
        elements[`${scope}ProgressBar`].style.width = `${safePercent}%`;
        elements[`${scope}ProgressText`].textContent = `${safePercent}%`;

        if (text) {
          elements[`${scope}StatusText`].textContent = text;
        }
      }

      function showToast(message) {
        elements.toast.textContent = message;
        elements.toast.classList.add('is-visible');
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => {
          elements.toast.classList.remove('is-visible');
        }, 4200);
      }

      function showResult(container, file) {
        const isImage = file.mimeType && file.mimeType.startsWith('image/');
        container.classList.add('is-visible');
        container.innerHTML = `
          <strong>Upload completed</strong>
          <a href="${file.publicUrl}" target="_blank" rel="noopener noreferrer">${file.publicUrl}</a>
          ${
            isImage
              ? `<img class="preview" src="${file.publicUrl}" alt="${file.originalName || file.storedFileName}" />`
              : `<span>${file.originalName || file.storedFileName} · ${formatFileSize(file.size || 0)}</span>`
          }
        `;
      }

      function resetResult(container) {
        container.classList.remove('is-visible');
        container.innerHTML = '';
      }

      function requestJson(method, url, body) {
        return fetch(url, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        }).then(async (response) => {
          const payload = await response.json().catch(() => null);

          if (!response.ok || !payload || payload.success === false) {
            throw new Error(payload?.message || `Request failed with status ${response.status}.`);
          }

          return payload.data;
        });
      }

      function uploadWithProgress(url, formData, onProgress) {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', url);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              onProgress((event.loaded / event.total) * 100);
            }
          };

          xhr.onload = () => {
            const payload = JSON.parse(xhr.responseText || 'null');

            if (xhr.status >= 200 && xhr.status < 300 && payload?.success) {
              resolve(payload.data);
              return;
            }

            reject(new Error(payload?.message || `Upload failed with status ${xhr.status}.`));
          };

          xhr.onerror = () => reject(new Error('Network error while uploading file.'));
          xhr.send(formData);
        });
      }

      function bindDropZone(dropZone, input, onFileSelected) {
        input.addEventListener('change', () => {
          onFileSelected(input.files[0] || null);
        });

        ['dragenter', 'dragover'].forEach((eventName) => {
          dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.add('is-active');
          });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
          dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.remove('is-active');
          });
        });

        dropZone.addEventListener('drop', (event) => {
          onFileSelected(event.dataTransfer.files[0] || null);
        });
      }

      function selectSingleFile(file) {
        state.singleFile = file;
        resetResult(elements.singleResult);
        setProgress('single', 0, file ? 'Ready to upload' : 'Ready');
        elements.singleSelectedFile.textContent = file
          ? `${file.name} · ${formatFileSize(file.size)}`
          : 'No file selected.';
      }

      async function uploadSingleFile() {
        if (!state.singleFile) {
          showToast('Please select a file before uploading.');
          return;
        }

        const formData = new FormData();
        formData.append('file', state.singleFile);

        elements.singleUploadButton.disabled = true;
        resetResult(elements.singleResult);
        setProgress('single', 0, 'Uploading');

        try {
          const file = await uploadWithProgress(
            `${getApiBaseUrl()}/api/uploads/single`,
            formData,
            (percent) => setProgress('single', percent, 'Uploading'),
          );
          setProgress('single', 100, 'Completed');
          showResult(elements.singleResult, file);
        } catch (error) {
          setProgress('single', 0, 'Failed');
          showToast(error.message);
        } finally {
          elements.singleUploadButton.disabled = false;
        }
      }

      function selectChunkFile(file) {
        state.chunkFile = file;
        resetResult(elements.chunkResult);
        setProgress('chunk', 0, file ? 'Ready to upload' : 'Ready');
        elements.chunkSelectedFile.textContent = file
          ? `${file.name} · ${formatFileSize(file.size)}`
          : 'No file selected.';
      }

      function saveChunkTask(task) {
        state.chunkTask = task;
        localStorage.setItem('fileUploadChunkTask', JSON.stringify(task));
      }

      function clearChunkTask() {
        state.chunkTask = null;
        localStorage.removeItem('fileUploadChunkTask');
      }

      async function createOrResumeChunkTask(file) {
        const chunkSize = 2 * 1024 * 1024;
        const totalChunks = Math.ceil(file.size / chunkSize);

        if (
          state.chunkTask &&
          state.chunkTask.fileName === file.name &&
          state.chunkTask.fileSize === file.size
        ) {
          const status = await requestJson(
            'GET',
            `${getApiBaseUrl()}/api/uploads/chunks/${state.chunkTask.uploadId}/status`,
          );
          return {
            ...state.chunkTask,
            uploadedChunks: status.uploadedChunks,
            totalChunks: status.totalChunks,
          };
        }

        const task = await requestJson('POST', `${getApiBaseUrl()}/api/uploads/chunks/init`, {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          chunkSize,
          totalChunks,
        });

        const nextTask = {
          uploadId: task.uploadId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          chunkSize,
          totalChunks,
          uploadedChunks: task.uploadedChunks,
        };

        saveChunkTask(nextTask);
        return nextTask;
      }

      async function uploadChunkPart(file, task, chunkIndex) {
        const start = chunkIndex * task.chunkSize;
        const end = Math.min(file.size, start + task.chunkSize);
        const formData = new FormData();

        formData.append('chunk', file.slice(start, end));
        formData.append('chunkIndex', String(chunkIndex));

        const response = await fetch(`${getApiBaseUrl()}/api/uploads/chunks/${task.uploadId}/part`, {
          method: 'POST',
          body: formData,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || `Chunk ${chunkIndex} failed.`);
        }

        return payload.data;
      }

      async function uploadLargeFile() {
        if (!state.chunkFile) {
          showToast('Please select a large file before uploading.');
          return;
        }

        elements.chunkUploadButton.disabled = true;
        elements.chunkResumeButton.disabled = true;
        resetResult(elements.chunkResult);

        try {
          const task = await createOrResumeChunkTask(state.chunkFile);
          const uploaded = new Set(task.uploadedChunks || []);
          const chunkIndexes = Array.from({ length: task.totalChunks }, (_, index) => index).filter(
            (index) => !uploaded.has(index),
          );
          const concurrency = 4;
          let cursor = 0;

          setProgress(
            'chunk',
            (uploaded.size / task.totalChunks) * 100,
            uploaded.size > 0 ? 'Resuming' : 'Uploading',
          );

          async function worker() {
            while (cursor < chunkIndexes.length) {
              const chunkIndex = chunkIndexes[cursor];
              cursor += 1;

              await uploadChunkPart(state.chunkFile, task, chunkIndex);
              uploaded.add(chunkIndex);
              saveChunkTask({ ...task, uploadedChunks: Array.from(uploaded) });
              setProgress('chunk', (uploaded.size / task.totalChunks) * 100, 'Uploading');
            }
          }

          await Promise.all(Array.from({ length: Math.min(concurrency, chunkIndexes.length) }, worker));
          setProgress('chunk', 100, 'Merging');

          const mergedFile = await requestJson(
            'POST',
            `${getApiBaseUrl()}/api/uploads/chunks/${task.uploadId}/merge`,
          );

          clearChunkTask();
          setProgress('chunk', 100, 'Completed');
          showResult(elements.chunkResult, mergedFile);
        } catch (error) {
          setProgress('chunk', 0, 'Failed');
          showToast(error.message);
        } finally {
          elements.chunkUploadButton.disabled = false;
          elements.chunkResumeButton.disabled = false;
        }
      }

      async function resumeChunkTask() {
        if (!state.chunkTask) {
          showToast('No unfinished chunk upload task was found in this browser.');
          return;
        }

        if (!state.chunkFile) {
          showToast('Please select the same local file first, then resume the task.');
          return;
        }

        await uploadLargeFile();
      }

      bindDropZone(elements.singleDropZone, elements.singleFileInput, selectSingleFile);
      bindDropZone(elements.chunkDropZone, elements.chunkFileInput, selectChunkFile);

      elements.singleUploadButton.addEventListener('click', uploadSingleFile);
      elements.singleResetButton.addEventListener('click', () => {
        elements.singleFileInput.value = '';
        selectSingleFile(null);
      });
      elements.chunkUploadButton.addEventListener('click', uploadLargeFile);
      elements.chunkResumeButton.addEventListener('click', resumeChunkTask);
      elements.chunkResetButton.addEventListener('click', () => {
        elements.chunkFileInput.value = '';
        selectChunkFile(null);
        clearChunkTask();
      });

      if (state.chunkTask) {
        elements.chunkStatusText.textContent = `Pending resume task: ${state.chunkTask.fileName}`;
      }
    </script>
  </body>
</html>
```

## 4. Complete package.json

```json
{
  "name": "file-upload-api-demo",
  "version": "1.0.0",
  "description": "Standalone file upload API demo with single file upload, large file chunk upload, resume support, static asset hosting, and cleanup jobs.",
  "main": "src/app.js",
  "type": "commonjs",
  "scripts": {
    "start": "node src/app.js",
    "dev": "node --watch src/app.js"
  },
  "keywords": [
    "file-upload",
    "chunk-upload",
    "express",
    "static-assets",
    "upwork-demo"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "multer": "^2.2.0"
  }
}
```

## 5. Commercial-Level README.md Optimized for Upwork Portfolio

```md
# file-upload-api-demo

## Project Introduction

`file-upload-api-demo` is a standalone file upload microservice demo built for freelance outsourcing scenarios. Many clients already have a frontend or backend system, but they need a decoupled upload module that can be integrated quickly without rewriting their existing architecture.

This demo solves common business problems around file upload workflows:

- A clean single file upload API for images, videos and documents.
- A large file chunk upload pipeline to reduce timeout and upload lag issues.
- Resume support so users do not need to retransmit finished chunks after a refresh or network interruption.
- Public static file URLs that can be embedded directly in a browser, admin panel or client application.
- Local disk storage for easy portfolio review, with clear extension points for cloud storage and production access control.

The repository is intentionally lightweight: no database, no frontend build process and no complex environment setup.

## Core Features

- Standalone upload service that can be integrated into existing client systems.
- Single file upload with extension whitelist, MIME validation and file size limit.
- Unique filename generation to prevent overwriting existing files.
- Large file chunk upload with init, parallel chunk upload, status lookup, resume and merge APIs.
- Automatic cleanup job for expired unmerged chunk folders.
- Public static asset hosting for images, videos and documents.
- Browser cache headers for static files.
- CORS configuration for separated frontend and backend deployments.
- Standard API response format for both success and error cases.
- Global error handling to keep the service stable.
- Readable request and upload progress logs.
- Standalone `index.html` demo page with drag-and-drop upload, progress bars, preview panel and clickable public URLs.

## Local Startup Guide

### 1. Install dependencies

```bash
npm install
```

### 2. Start the upload service

```bash
npm start
```

The server starts on:

```text
http://localhost:4000
```

Open the frontend demo page:

```text
http://localhost:4000/index.html
```

You can also open `public/index.html` directly in a browser. Keep the API Base field as `http://localhost:4000`.

### Optional development mode

```bash
npm run dev
```

## Configuration

All adjustable parameters are centralized in `src/config/index.js`.

Environment variables can override the defaults:

```bash
PORT=4000
PUBLIC_BASE_URL=http://localhost:4000
UPLOAD_DIR=storage/uploads
CHUNK_DIR=storage/chunks
MAX_SINGLE_FILE_SIZE_BYTES=52428800
MAX_CHUNK_UPLOAD_FILE_SIZE_BYTES=524288000
MAX_CHUNK_SIZE_BYTES=8388608
DEFAULT_CHUNK_SIZE_BYTES=2097152
ALLOWED_ORIGINS=*
CHUNK_EXPIRY_MS=86400000
CLEANUP_INTERVAL_MS=1800000
```

## REST API Documentation

### Health Check

```http
GET /health
```

Response example:

```json
{
  "success": true,
  "message": "File upload service is healthy.",
  "data": {
    "uptime": 18.51
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Read Upload Configuration

```http
GET /api/uploads/config
```

Response example:

```json
{
  "success": true,
  "message": "Upload configuration loaded successfully.",
  "data": {
    "maxSingleFileSizeBytes": 52428800,
    "maxChunkUploadFileSizeBytes": 524288000,
    "maxChunkSizeBytes": 8388608,
    "defaultChunkSizeBytes": 2097152,
    "allowedExtensions": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov", ".pdf"],
    "allowedMimeTypes": ["image/jpeg", "image/png", "video/mp4", "application/pdf"],
    "publicBaseUrl": "http://localhost:4000"
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Single File Upload

```http
POST /api/uploads/single
Content-Type: multipart/form-data
```

Request params:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| file | File | Yes | The file to upload. |

Response example:

```json
{
  "success": true,
  "message": "File uploaded successfully.",
  "data": {
    "originalName": "contract.pdf",
    "storedFileName": "1782450012345-a1b2c3d4e5f6.pdf",
    "mimeType": "application/pdf",
    "size": 245760,
    "publicUrl": "http://localhost:4000/static/1782450012345-a1b2c3d4e5f6.pdf"
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Initialize Large File Chunk Upload

```http
POST /api/uploads/chunks/init
Content-Type: application/json
```

Request body:

```json
{
  "fileName": "product-demo.mp4",
  "mimeType": "video/mp4",
  "fileSize": 73400320,
  "chunkSize": 2097152,
  "totalChunks": 35
}
```

Response example:

```json
{
  "success": true,
  "message": "Chunk upload task initialized.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "uploadedChunks": [],
    "expiresInMs": 86400000,
    "recommendedChunkSize": 2097152
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Upload One Chunk

```http
POST /api/uploads/chunks/:uploadId/part
Content-Type: multipart/form-data
```

Request params:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| chunk | File | Yes | Current chunk binary. |
| chunkIndex | Number | Yes | Zero-based chunk index. |

Response example:

```json
{
  "success": true,
  "message": "Chunk uploaded successfully.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "chunkIndex": 3,
    "uploadedChunks": [0, 1, 2, 3],
    "receivedChunks": 4,
    "totalChunks": 35
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Read Chunk Upload Status

```http
GET /api/uploads/chunks/:uploadId/status
```

Use this endpoint after a page refresh or network interruption to skip chunks already uploaded.

Response example:

```json
{
  "success": true,
  "message": "Upload status loaded successfully.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "status": "uploading",
    "originalName": "product-demo.mp4",
    "totalChunks": 35,
    "uploadedChunks": [0, 1, 2, 3],
    "missingChunks": [4, 5, 6]
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Merge Uploaded Chunks

```http
POST /api/uploads/chunks/:uploadId/merge
```

Response example:

```json
{
  "success": true,
  "message": "Chunks merged successfully.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "originalName": "product-demo.mp4",
    "storedFileName": "1782450099999-f6e5d4c3b2a1.mp4",
    "mimeType": "video/mp4",
    "size": 73400320,
    "publicUrl": "http://localhost:4000/static/1782450099999-f6e5d4c3b2a1.mp4"
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Static File Access

```http
GET /static/:storedFileName
```

Uploaded files are served from the static route with browser cache headers and cross-origin resource access.

## Standard Error Response

```json
{
  "success": false,
  "message": "This file extension is not allowed.",
  "error": {
    "code": 400,
    "details": {
      "extension": ".exe"
    }
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

## Production-Grade Upgrade Extensions

I can adapt this upload module for real client systems with:

- Cloud storage integration with AWS S3, Google Cloud Storage, Azure Blob Storage or Cloudflare R2.
- User file isolation by account, tenant, project or workspace.
- Upload rate limiting to protect backend resources.
- Thumbnail generation for images and videos.
- Token authentication and permission checks for private files.
- File compression and image optimization.
- Virus scanning and content moderation workflows.
- CDN integration for faster global static resource delivery.
- Redis or database-backed upload state for multi-server deployments.
- Background queue processing for file conversion and metadata extraction.

## Portfolio Blurb

I built a standalone Node.js file upload microservice demo that supports regular file uploads, large file chunk uploads, resume upload, static file hosting, validation, CORS, cleanup jobs and a no-build frontend demo page. It is designed as a reusable upload module for clients who want to integrate reliable file handling into an existing web or backend system without rebuilding their whole application.

## Pre-Sales Message Template

Hi, I have built a standalone file upload module that can be integrated into an existing web app or backend system. It supports normal uploads, large file chunk upload, resume after interruption, validation, public file URLs, static hosting and cleanup of unfinished chunks. I can adapt it to your project with cloud storage, user permissions, token authentication, rate limiting, thumbnails or compression based on your business needs.
```

## 6. Concise English Portfolio Blurb

I built a standalone Node.js file upload microservice demo that supports regular file uploads, large file chunk uploads, resume upload, static file hosting, validation, CORS, cleanup jobs and a no-build frontend demo page. It is designed as a reusable upload module for clients who want to integrate reliable file handling into an existing web or backend system without rebuilding their whole application.

## 7. Short English Pre-Sales Message Template

Hi, I have built a standalone file upload module that can be integrated into an existing web app or backend system. It supports normal uploads, large file chunk upload, resume after interruption, validation, public file URLs, static hosting and cleanup of unfinished chunks. I can adapt it to your project with cloud storage, user permissions, token authentication, rate limiting, thumbnails or compression based on your business needs.
