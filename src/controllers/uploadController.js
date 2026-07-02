const config = require('../config');
const {
  deleteFile,
  deleteFiles,
  getFileRecord,
  listFileHistory,
  listFiles,
  rotateShareLink,
  saveSingleFile,
  sendFileResponse,
  sendSharedFile,
  streamBatchDownload,
  updateFileAccess,
} = require('../services/fileService');
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

async function listUploadedFiles(req, res) {
  const result = await listFiles(req.query);

  res.success(result, 'Uploaded files loaded successfully.');
}

async function getUploadedFile(req, res) {
  const result = await getFileRecord(req.params.storedFileName);

  res.success(result, 'Uploaded file loaded successfully.');
}

async function deleteUploadedFile(req, res) {
  const result = await deleteFile(req.params.storedFileName);

  res.success(result, 'Uploaded file deleted successfully.');
}

async function deleteUploadedFiles(req, res) {
  const result = await deleteFiles(req.body.storedFileNames || []);

  res.success(result, 'Uploaded files deleted successfully.');
}

async function downloadUploadedFiles(req, res) {
  await streamBatchDownload({
    storedFileNames: req.body.storedFileNames || [],
    res,
  });
}

async function previewUploadedFile(req, res) {
  await sendFileResponse({
    storedFileName: req.params.storedFileName,
    res,
  });
}

async function downloadUploadedFile(req, res) {
  await sendFileResponse({
    storedFileName: req.params.storedFileName,
    res,
    asAttachment: true,
  });
}

async function updateUploadedFileAccess(req, res) {
  const result = await updateFileAccess(req.params.storedFileName, req.body);

  res.success(result, 'File access updated successfully.');
}

async function rotateUploadedFileShareLink(req, res) {
  const result = await rotateShareLink(req.params.storedFileName);

  res.success(result, 'Private share link updated successfully.');
}

async function listUploadedFileHistory(req, res) {
  const result = await listFileHistory(req.query);

  res.success(result, 'Upload history loaded successfully.');
}

async function previewSharedFile(req, res) {
  await sendSharedFile({
    token: req.params.token,
    res,
  });
}

async function downloadSharedFile(req, res) {
  await sendSharedFile({
    token: req.params.token,
    res,
    asAttachment: true,
  });
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
  deleteUploadedFiles,
  deleteUploadedFile,
  downloadSharedFile,
  downloadUploadedFile,
  downloadUploadedFiles,
  getUploadedFile,
  initLargeFileUpload,
  listUploadedFileHistory,
  listUploadedFiles,
  mergeLargeFileChunks,
  previewSharedFile,
  previewUploadedFile,
  readLargeFileUploadStatus,
  readUploadConfig,
  rotateUploadedFileShareLink,
  updateUploadedFileAccess,
  uploadChunk,
  uploadSingleFile,
};
