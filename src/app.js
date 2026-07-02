const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const uploadRoutes = require('./routes/uploadRoutes');
const { getFileRecord } = require('./services/fileService');
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
  async (req, res, next) => {
    const requestedFileName = path.basename(decodeURIComponent(req.path || ''));

    try {
      const record = await getFileRecord(requestedFileName);

      if (record.visibility === 'private') {
        next(new HttpError(403, 'This file is private. Use its private share link instead.'));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  },
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
