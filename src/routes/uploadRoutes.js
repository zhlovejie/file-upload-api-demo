const express = require('express');
const {
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
} = require('../controllers/uploadController');
const {
  chunkUploadMiddleware,
  singleFileUploadMiddleware,
} = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/config', readUploadConfig);
router.get('/files', asyncHandler(listUploadedFiles));
router.get('/history', asyncHandler(listUploadedFileHistory));
router.post('/files/batch-delete', asyncHandler(deleteUploadedFiles));
router.post('/files/batch-download', asyncHandler(downloadUploadedFiles));
router.get('/files/:storedFileName', asyncHandler(getUploadedFile));
router.get('/files/:storedFileName/preview', asyncHandler(previewUploadedFile));
router.get('/files/:storedFileName/download', asyncHandler(downloadUploadedFile));
router.patch('/files/:storedFileName/access', asyncHandler(updateUploadedFileAccess));
router.post('/files/:storedFileName/share', asyncHandler(rotateUploadedFileShareLink));
router.delete('/files/:storedFileName', asyncHandler(deleteUploadedFile));
router.get('/share/:token', asyncHandler(previewSharedFile));
router.get('/share/:token/download', asyncHandler(downloadSharedFile));
router.post('/single', singleFileUploadMiddleware, asyncHandler(uploadSingleFile));
router.post('/chunks/init', asyncHandler(initLargeFileUpload));
router.get('/chunks/:uploadId/status', asyncHandler(readLargeFileUploadStatus));
router.post('/chunks/:uploadId/part', chunkUploadMiddleware, asyncHandler(uploadChunk));
router.post('/chunks/:uploadId/merge', asyncHandler(mergeLargeFileChunks));

module.exports = router;
