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
