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
