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
