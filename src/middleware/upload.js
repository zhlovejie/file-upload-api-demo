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
