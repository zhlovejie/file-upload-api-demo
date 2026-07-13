const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { Readable } = require('stream');
const config = require('../config');
const HttpError = require('../utils/httpError');
const {
  createRandomString,
  createUniqueFileName,
  ensureDirectory,
  normalizeExtension,
  pathExists,
  sanitizeFileName,
} = require('../utils/fileHelpers');

const fileIndexName = '.file-index.json';
const fileHistoryName = '.file-history.json';
const metadataCacheMaxAgeSeconds = 60;
const fileCacheMaxAgeSeconds = 7 * 24 * 60 * 60;

async function loadZipArchive() {
  const archiver = await import('archiver');
  return archiver.ZipArchive;
}

async function loadBlobSdk() {
  return import('@vercel/blob');
}

function isBlobStorageEnabled() {
  return config.storage.driver === 'vercel-blob';
}

function getBlobPath(...parts) {
  return [config.storage.blobPrefix, ...parts].filter(Boolean).join('/');
}

function getFileBlobPath(storedFileName) {
  return getBlobPath('uploads', storedFileName);
}

function getFileNameFromPathname(value) {
  return path.posix.basename(String(value || '').replace(/\\/g, '/'));
}

function getIndexBlobPath() {
  return getBlobPath('metadata', fileIndexName);
}

function getHistoryBlobPath() {
  return getBlobPath('metadata', fileHistoryName);
}

function getPublicBaseUrl(options = {}) {
  return options.publicBaseUrl || config.app.publicBaseUrl;
}

function buildPublicUrl(fileName, options = {}) {
  return `${getPublicBaseUrl(options)}${config.storage.publicRoute}/${encodeURIComponent(fileName)}`;
}

function buildPreviewUrl(fileName, options = {}) {
  return `${getPublicBaseUrl(options)}/api/uploads/files/${encodeURIComponent(fileName)}/preview`;
}

function buildDownloadUrl(fileName, options = {}) {
  return `${getPublicBaseUrl(options)}/api/uploads/files/${encodeURIComponent(fileName)}/download`;
}

function buildShareUrl(token, options = {}) {
  return `${getPublicBaseUrl(options)}/api/uploads/share/${encodeURIComponent(token)}`;
}

function buildShareDownloadUrl(token, options = {}) {
  return `${buildShareUrl(token, options)}/download`;
}

async function readStreamBuffer(stream) {
  if (!stream) {
    return Buffer.alloc(0);
  }

  if (typeof stream.getReader === 'function') {
    return Buffer.from(await new Response(stream).arrayBuffer());
  }

  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function readBlobJson(pathname, fallback) {
  const { BlobNotFoundError, get } = await loadBlobSdk();

  try {
    const result = await get(pathname, {
      access: 'public',
      useCache: false,
    });

    if (!result?.stream) {
      return fallback;
    }

    const raw = (await readStreamBuffer(result.stream)).toString('utf8');
    const parsed = JSON.parse(raw);

    return Array.isArray(fallback) ? (Array.isArray(parsed) ? parsed : fallback) : parsed;
  } catch (error) {
    if (error instanceof BlobNotFoundError || error.status === 404) {
      return fallback;
    }

    throw error;
  }
}

async function writeBlobJson(pathname, payload) {
  const { put } = await loadBlobSdk();

  await put(pathname, JSON.stringify(payload, null, 2), {
    access: 'public',
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: metadataCacheMaxAgeSeconds,
  });
}

async function readBlobFileBuffer(record) {
  const { get } = await loadBlobSdk();
  const result = await get(record.blobPathname || getFileBlobPath(record.storedFileName), {
    access: 'public',
    useCache: false,
  });

  if (!result?.stream) {
    throw new HttpError(404, 'Uploaded file was not found.');
  }

  return readStreamBuffer(result.stream);
}

async function streamBlobFileResponse({ record, res, asAttachment = false }) {
  const { get } = await loadBlobSdk();
  const result = await get(record.blobPathname || getFileBlobPath(record.storedFileName), {
    access: 'public',
    useCache: true,
  });

  if (!result?.stream) {
    throw new HttpError(404, 'Uploaded file was not found.');
  }

  res.setHeader('Content-Type', getResponseMimeType(record, result.blob?.contentType));
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (asAttachment) {
    res.attachment(sanitizeFileName(record.originalName || record.storedFileName));
  }

  const source =
    typeof result.stream.getReader === 'function' ? Readable.fromWeb(result.stream) : result.stream;
  source.pipe(res);
}

function getFileIndexPath() {
  return path.join(config.storage.uploadDir, fileIndexName);
}

function getFileHistoryPath() {
  return path.join(config.storage.uploadDir, fileHistoryName);
}

function getFileType(fileName, mimeType = '') {
  const extension = normalizeExtension(fileName).replace('.', '');
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const videoExtensions = ['mp4', 'mov'];

  if (mimeType.startsWith('image/') || imageExtensions.includes(extension)) {
    return 'image';
  }

  if (mimeType.startsWith('video/') || videoExtensions.includes(extension)) {
    return 'video';
  }

  if (mimeType.includes('pdf') || extension === 'pdf') {
    return 'pdf';
  }

  if (mimeType.includes('word') || ['doc', 'docx'].includes(extension)) {
    return 'document';
  }

  if (mimeType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(extension)) {
    return 'spreadsheet';
  }

  if (mimeType.includes('zip') || extension === 'zip') {
    return 'archive';
  }

  if (mimeType.startsWith('text/') || extension === 'txt') {
    return 'text';
  }

  return extension || 'file';
}

function getResponseMimeType(record, fallback = 'application/octet-stream') {
  if (record.mimeType && record.mimeType !== 'application/octet-stream') {
    return record.mimeType;
  }

  const extension = normalizeExtension(record.storedFileName || record.originalName || '');
  const mimeTypesByExtension = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.zip': 'application/zip',
  };

  return mimeTypesByExtension[extension] || fallback;
}

function createFileRecord(
  { originalName, storedFileName, mimeType, size, uploadedAt, blobPathname, blobUrl, blobDownloadUrl },
  options = {},
) {
  const shareToken = createRandomString(24);

  return {
    id: storedFileName,
    originalName: sanitizeFileName(originalName || storedFileName),
    storedFileName,
    mimeType: mimeType || 'application/octet-stream',
    fileType: getFileType(storedFileName, mimeType),
    extension: normalizeExtension(storedFileName),
    size: Number(size || 0),
    uploadedAt: uploadedAt || new Date().toISOString(),
    visibility: 'public',
    shareToken,
    blobPathname,
    blobUrl,
    blobDownloadUrl,
    publicUrl: buildPublicUrl(storedFileName, options),
    previewUrl: buildPreviewUrl(storedFileName, options),
    downloadUrl: buildDownloadUrl(storedFileName, options),
    shareUrl: buildShareUrl(shareToken, options),
    shareDownloadUrl: buildShareDownloadUrl(shareToken, options),
  };
}

function normalizeFileRecord(record, options = {}) {
  const storedFileName = getFileNameFromPathname(record.storedFileName || record.id || record.blobPathname || '');
  const shareToken = record.shareToken || createRandomString(24);

  const visibility = record.visibility === 'private' ? 'private' : 'public';

  return {
    id: storedFileName,
    originalName: sanitizeFileName(record.originalName || storedFileName),
    storedFileName,
    mimeType: record.mimeType || 'application/octet-stream',
    fileType: record.fileType || getFileType(storedFileName, record.mimeType),
    extension: normalizeExtension(storedFileName),
    size: Number(record.size || 0),
    uploadedAt: record.uploadedAt || new Date().toISOString(),
    uploadId: record.uploadId,
    visibility,
    shareToken,
    blobPathname: record.blobPathname,
    blobUrl: record.blobUrl,
    blobDownloadUrl: record.blobDownloadUrl,
    publicUrl: buildPublicUrl(storedFileName, options),
    previewUrl:
      visibility === 'private' ? buildShareUrl(shareToken, options) : buildPreviewUrl(storedFileName, options),
    downloadUrl:
      visibility === 'private' ? buildShareDownloadUrl(shareToken, options) : buildDownloadUrl(storedFileName, options),
    shareUrl: buildShareUrl(shareToken, options),
    shareDownloadUrl: buildShareDownloadUrl(shareToken, options),
  };
}

async function readFileIndex() {
  if (isBlobStorageEnabled()) {
    return readBlobJson(getIndexBlobPath(), []);
  }

  await ensureDirectory(config.storage.uploadDir);

  if (!(await pathExists(getFileIndexPath()))) {
    return [];
  }

  try {
    const rawIndex = await fs.readFile(getFileIndexPath(), 'utf8');
    const records = JSON.parse(rawIndex);

    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

async function writeFileIndex(records) {
  if (isBlobStorageEnabled()) {
    await writeBlobJson(getIndexBlobPath(), records);
    return;
  }

  await ensureDirectory(config.storage.uploadDir);
  await fs.writeFile(getFileIndexPath(), JSON.stringify(records, null, 2));
}

async function readFileHistory() {
  if (isBlobStorageEnabled()) {
    return readBlobJson(getHistoryBlobPath(), []);
  }

  await ensureDirectory(config.storage.uploadDir);

  if (!(await pathExists(getFileHistoryPath()))) {
    return [];
  }

  try {
    const rawHistory = await fs.readFile(getFileHistoryPath(), 'utf8');
    const records = JSON.parse(rawHistory);

    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

async function writeFileHistory(records) {
  if (isBlobStorageEnabled()) {
    await writeBlobJson(getHistoryBlobPath(), records.slice(0, 500));
    return;
  }

  await ensureDirectory(config.storage.uploadDir);
  await fs.writeFile(getFileHistoryPath(), JSON.stringify(records.slice(0, 500), null, 2));
}

async function recordFileHistory({ action, file, count, details }) {
  const history = await readFileHistory();
  const nextEntry = {
    id: `${Date.now()}-${createRandomString(8)}`,
    action,
    storedFileName: file?.storedFileName,
    originalName: file?.originalName,
    fileType: file?.fileType,
    size: file?.size,
    count,
    details: details || null,
    createdAt: new Date().toISOString(),
  };

  await writeFileHistory([nextEntry, ...history]);

  return nextEntry;
}

async function readDiskFileRecords(options = {}) {
  await ensureDirectory(config.storage.uploadDir);

  const entries = await fs.readdir(config.storage.uploadDir, { withFileTypes: true });
  const records = [];

  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith('.')) {
      continue;
    }

    const filePath = path.join(config.storage.uploadDir, entry.name);
    const stats = await fs.stat(filePath);

    records.push(
      normalizeFileRecord({
        originalName: entry.name,
        storedFileName: entry.name,
        size: stats.size,
        uploadedAt: stats.birthtime.toISOString(),
      }, options),
    );
  }

  return records;
}

async function readBlobFileRecords(options = {}) {
  const { list } = await loadBlobSdk();
  const prefix = `${getBlobPath('uploads')}/`;
  const records = [];
  let cursor;

  do {
    const result = await list({
      prefix,
      cursor,
      limit: 1000,
    });

    for (const blob of result.blobs) {
      const storedFileName = getFileNameFromPathname(blob.pathname);

      if (!storedFileName) {
        continue;
      }

      records.push(
        normalizeFileRecord(
          {
            originalName: storedFileName,
            storedFileName,
            size: blob.size,
            uploadedAt: blob.uploadedAt ? new Date(blob.uploadedAt).toISOString() : undefined,
            blobPathname: blob.pathname,
            blobUrl: blob.url,
            blobDownloadUrl: blob.downloadUrl,
          },
          options,
        ),
      );
    }

    cursor = result.cursor;
  } while (cursor);

  return records;
}

async function readMergedFileRecords(options = {}) {
  const indexedRecords = await readFileIndex();

  if (isBlobStorageEnabled()) {
    const blobRecords = await readBlobFileRecords(options);
    const indexedByName = new Map(
      indexedRecords.map((record) => [
        getFileNameFromPathname(record.storedFileName || record.id || record.blobPathname),
        record,
      ]),
    );

    return blobRecords.map((blobRecord) => {
      const indexedRecord = indexedByName.get(blobRecord.storedFileName) || {};

      return normalizeFileRecord(
        {
          ...blobRecord,
          ...indexedRecord,
          storedFileName: blobRecord.storedFileName,
          size: blobRecord.size,
          uploadedAt: indexedRecord.uploadedAt || blobRecord.uploadedAt,
          blobPathname: blobRecord.blobPathname,
          blobUrl: blobRecord.blobUrl,
          blobDownloadUrl: blobRecord.blobDownloadUrl,
        },
        options,
      );
    });
  }

  const diskRecords = await readDiskFileRecords(options);
  const recordById = new Map();

  for (const record of diskRecords) {
    recordById.set(record.storedFileName, record);
  }

  for (const record of indexedRecords) {
    const diskRecord = recordById.get(record.storedFileName);

    if (!diskRecord) {
      continue;
    }

    recordById.set(
      record.storedFileName,
      normalizeFileRecord({
        ...diskRecord,
        ...record,
        size: diskRecord.size,
        uploadedAt: record.uploadedAt || diskRecord.uploadedAt,
      }, options),
    );
  }

  const records = Array.from(recordById.values());
  await writeFileIndex(records);

  return records;
}

function sortRecords(records, sortBy, sortOrder) {
  const direction = sortOrder === 'asc' ? 1 : -1;
  const sortAccessors = {
    fileName: (record) => record.originalName.toLowerCase(),
    fileType: (record) => record.fileType.toLowerCase(),
    uploadedAt: (record) => new Date(record.uploadedAt).getTime(),
    size: (record) => record.size,
    visibility: (record) => record.visibility,
  };
  const accessor = sortAccessors[sortBy] || sortAccessors.uploadedAt;

  return [...records].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    if (leftValue > rightValue) {
      return direction;
    }

    if (leftValue < rightValue) {
      return -direction;
    }

    return left.originalName.localeCompare(right.originalName);
  });
}

async function listFiles(query = {}, options = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const requestedPageSize = Number(query.pageSize || 10);
  const pageSize = [10, 20, 30, 40, 50].includes(requestedPageSize) ? requestedPageSize : 10;
  const keyword = String(query.keyword || '').trim().toLowerCase();
  const sortBy = query.sortBy || 'uploadedAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  const fileType = String(query.fileType || '').trim().toLowerCase();
  const visibility = String(query.visibility || '').trim().toLowerCase();
  const uploadedFrom = query.uploadedFrom ? new Date(query.uploadedFrom).getTime() : null;
  const uploadedTo = query.uploadedTo ? new Date(query.uploadedTo).getTime() : null;
  const minSize = query.minSize ? Number(query.minSize) : null;
  const maxSize = query.maxSize ? Number(query.maxSize) : null;

  let records = await readMergedFileRecords(options);

  if (keyword) {
    records = records.filter((record) =>
      [record.originalName, record.storedFileName, record.fileType, record.extension]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }

  if (fileType && fileType !== 'all') {
    records = records.filter((record) => record.fileType === fileType);
  }

  if (visibility && visibility !== 'all') {
    records = records.filter((record) => record.visibility === visibility);
  }

  if (Number.isFinite(uploadedFrom)) {
    records = records.filter((record) => new Date(record.uploadedAt).getTime() >= uploadedFrom);
  }

  if (Number.isFinite(uploadedTo)) {
    const endOfDay = uploadedTo + 24 * 60 * 60 * 1000 - 1;
    records = records.filter((record) => new Date(record.uploadedAt).getTime() <= endOfDay);
  }

  if (Number.isFinite(minSize)) {
    records = records.filter((record) => record.size >= minSize);
  }

  if (Number.isFinite(maxSize)) {
    records = records.filter((record) => record.size <= maxSize);
  }

  records = sortRecords(records, sortBy, sortOrder);

  const total = records.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: records.slice(start, start + pageSize),
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
    },
    sorting: {
      sortBy,
      sortOrder,
    },
  };
}

async function saveFileRecord(record, options = {}) {
  const records = await readMergedFileRecords(options);
  const existingRecord = records.find((item) => item.storedFileName === record.storedFileName);
  const nextRecord = normalizeFileRecord({
    ...createFileRecord(record, options),
    ...existingRecord,
    ...record,
  }, options);
  const nextRecords = [
    nextRecord,
    ...records.filter((item) => item.storedFileName !== nextRecord.storedFileName),
  ];

  await writeFileIndex(nextRecords);
  await recordFileHistory({ action: 'uploaded', file: nextRecord });

  return nextRecord;
}

async function getFileRecord(storedFileName, options = {}) {
  const safeFileName = path.basename(storedFileName || '');

  if (!safeFileName || safeFileName === fileIndexName || safeFileName === fileHistoryName) {
    throw new HttpError(400, 'A valid file name is required.');
  }

  const records = await readMergedFileRecords(options);
  const record = records.find((item) => item.storedFileName === safeFileName);

  if (!record) {
    throw new HttpError(404, 'Uploaded file was not found.');
  }

  return record;
}

async function updateFileAccess(storedFileName, payload = {}, options = {}) {
  const safeFileName = path.basename(storedFileName || '');
  const visibility = payload.visibility === 'private' ? 'private' : 'public';
  const records = await readMergedFileRecords(options);
  const record = records.find((item) => item.storedFileName === safeFileName);

  if (!record) {
    throw new HttpError(404, 'Uploaded file was not found.');
  }

  const updatedRecord = normalizeFileRecord({
    ...record,
    visibility,
    shareToken: payload.rotateShareToken ? createRandomString(24) : record.shareToken,
  }, options);

  await writeFileIndex(
    records.map((item) => (item.storedFileName === safeFileName ? updatedRecord : item)),
  );
  await recordFileHistory({
    action: visibility === 'private' ? 'made-private' : 'made-public',
    file: updatedRecord,
  });

  return updatedRecord;
}

async function rotateShareLink(storedFileName, options = {}) {
  const safeFileName = path.basename(storedFileName || '');
  const records = await readMergedFileRecords(options);
  const record = records.find((item) => item.storedFileName === safeFileName);

  if (!record) {
    throw new HttpError(404, 'Uploaded file was not found.');
  }

  const updatedRecord = normalizeFileRecord({
    ...record,
    shareToken: createRandomString(24),
  }, options);

  await writeFileIndex(
    records.map((item) => (item.storedFileName === safeFileName ? updatedRecord : item)),
  );
  await recordFileHistory({ action: 'share-link-rotated', file: updatedRecord });

  return updatedRecord;
}

async function deleteFile(storedFileName) {
  const safeFileName = path.basename(storedFileName || '');

  if (!safeFileName || safeFileName === fileIndexName || safeFileName === fileHistoryName) {
    throw new HttpError(400, 'A valid file name is required.');
  }

  const records = isBlobStorageEnabled() ? await readMergedFileRecords() : await readFileIndex();
  const deletedRecord = records.find((record) => record.storedFileName === safeFileName);

  if (isBlobStorageEnabled()) {
    if (!deletedRecord) {
      throw new HttpError(404, 'Uploaded file was not found.');
    }

    const { del } = await loadBlobSdk();
    await del(deletedRecord.blobPathname || getFileBlobPath(safeFileName)).catch(() => null);
  } else {
    const targetPath = path.join(config.storage.uploadDir, safeFileName);

    if (!(await pathExists(targetPath))) {
      throw new HttpError(404, 'Uploaded file was not found.');
    }

    await fs.rm(targetPath, { force: true });
  }

  await writeFileIndex(records.filter((record) => record.storedFileName !== safeFileName));
  await recordFileHistory({
    action: 'deleted',
    file: deletedRecord || { storedFileName: safeFileName, originalName: safeFileName },
  });

  return {
    storedFileName: safeFileName,
  };
}

async function deleteFiles(storedFileNames = []) {
  const uniqueNames = [...new Set(storedFileNames.map((name) => path.basename(name || '')))].filter(
    Boolean,
  );

  if (uniqueNames.length === 0) {
    throw new HttpError(400, 'At least one file name is required.');
  }

  const results = [];

  for (const storedFileName of uniqueNames) {
    try {
      await deleteFile(storedFileName);
      results.push({ storedFileName, deleted: true });
    } catch (error) {
      results.push({
        storedFileName,
        deleted: false,
        message: error.message,
      });
    }
  }

  await recordFileHistory({
    action: 'batch-deleted',
    count: results.filter((item) => item.deleted).length,
    details: results,
  });

  return {
    deletedCount: results.filter((item) => item.deleted).length,
    failedCount: results.filter((item) => !item.deleted).length,
    results,
  };
}

async function streamBatchDownload({ storedFileNames = [], res }) {
  const uniqueNames = [...new Set(storedFileNames.map((name) => path.basename(name || '')))].filter(
    Boolean,
  );

  if (uniqueNames.length === 0) {
    throw new HttpError(400, 'At least one file name is required.');
  }

  const records = await readMergedFileRecords();
  const recordByName = new Map(records.map((record) => [record.storedFileName, record]));
  const filesToArchive = [];

  for (const storedFileName of uniqueNames) {
    const record = recordByName.get(storedFileName);

    if (!record) {
      continue;
    }

    if (isBlobStorageEnabled()) {
      try {
        filesToArchive.push({
          buffer: await readBlobFileBuffer(record),
          name: sanitizeFileName(record.originalName || record.storedFileName),
        });
      } catch {
        continue;
      }
    } else {
      const filePath = path.join(config.storage.uploadDir, storedFileName);

      if (!(await pathExists(filePath))) {
        continue;
      }

      filesToArchive.push({
        path: filePath,
        name: sanitizeFileName(record.originalName || record.storedFileName),
      });
    }
  }

  if (filesToArchive.length === 0) {
    throw new HttpError(404, 'No downloadable files were found.');
  }

  const ZipArchive = await loadZipArchive();
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  res.attachment(`uploaded-files-${timestamp}.zip`);
  archive.on('error', (error) => {
    res.destroy(error);
  });
  archive.pipe(res);

  for (const file of filesToArchive) {
    if (file.buffer) {
      archive.append(file.buffer, { name: file.name });
    } else {
      archive.file(file.path, { name: file.name });
    }
  }

  await recordFileHistory({
    action: 'batch-downloaded',
    count: filesToArchive.length,
    details: uniqueNames,
  });

  archive.finalize();
}

async function getFileByShareToken(token) {
  const safeToken = String(token || '').trim();
  const records = await readMergedFileRecords();
  const record = records.find((item) => item.shareToken === safeToken);

  if (!record) {
    throw new HttpError(404, 'Share link was not found or has expired.');
  }

  return record;
}

async function sendFileResponse({ storedFileName, res, asAttachment = false }) {
  const record = await getFileRecord(storedFileName);

  if (isBlobStorageEnabled()) {
    await streamBlobFileResponse({ record, res, asAttachment });
    return;
  }

  const filePath = path.join(config.storage.uploadDir, record.storedFileName);

  if (!(await pathExists(filePath))) {
    throw new HttpError(404, 'Uploaded file was not found.');
  }

  res.setHeader('Content-Type', getResponseMimeType(record));
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (asAttachment) {
    res.download(filePath, record.originalName);
    return;
  }

  fsSync.createReadStream(filePath).pipe(res);
}

async function sendSharedFile({ token, res, asAttachment = false }) {
  const record = await getFileByShareToken(token);

  if (isBlobStorageEnabled()) {
    await streamBlobFileResponse({ record, res, asAttachment });
    return;
  }

  const filePath = path.join(config.storage.uploadDir, record.storedFileName);

  if (!(await pathExists(filePath))) {
    throw new HttpError(404, 'Shared file was not found.');
  }

  res.setHeader('Content-Type', getResponseMimeType(record));

  if (asAttachment) {
    res.download(filePath, record.originalName);
    return;
  }

  fsSync.createReadStream(filePath).pipe(res);
}

async function listFileHistory(query = {}) {
  const limit = Math.min(Math.max(Number(query.limit || 80), 1), 200);
  const storedFileName = query.storedFileName ? path.basename(query.storedFileName) : '';
  let records = await readFileHistory();

  if (storedFileName) {
    records = records.filter((record) => record.storedFileName === storedFileName);
  }

  return records.slice(0, limit);
}

async function saveSingleFile(file, options = {}) {
  await ensureDirectory(config.storage.uploadDir);

  const storedFileName = createUniqueFileName(file.originalname);
  let blobResult = null;

  if (isBlobStorageEnabled()) {
    const { put } = await loadBlobSdk();
    blobResult = await put(getFileBlobPath(storedFileName), file.buffer, {
      access: 'public',
      allowOverwrite: false,
      contentType: file.mimetype || 'application/octet-stream',
      cacheControlMaxAge: fileCacheMaxAgeSeconds,
    });
  } else {
    const destinationPath = path.join(config.storage.uploadDir, storedFileName);

    // Extension point: replace this local write with AWS S3, Cloudflare R2,
    // Google Cloud Storage or Azure Blob Storage in a client production system.
    await fs.writeFile(destinationPath, file.buffer);
  }

  return saveFileRecord({
    originalName: sanitizeFileName(file.originalname),
    storedFileName,
    mimeType: file.mimetype,
    size: file.size,
    blobPathname: blobResult?.pathname,
    blobUrl: blobResult?.url,
    blobDownloadUrl: blobResult?.downloadUrl,
  }, options);
}

async function saveFileFromPath(
  { sourcePath, originalName, storedFileName, mimeType, size, uploadId },
  options = {},
) {
  let blobResult = null;

  if (isBlobStorageEnabled()) {
    const { put } = await loadBlobSdk();
    blobResult = await put(getFileBlobPath(storedFileName), fsSync.createReadStream(sourcePath), {
      access: 'public',
      allowOverwrite: false,
      contentType: mimeType || 'application/octet-stream',
      cacheControlMaxAge: fileCacheMaxAgeSeconds,
    });
  }

  return saveFileRecord(
    {
      uploadId,
      originalName: sanitizeFileName(originalName),
      storedFileName,
      mimeType,
      size,
      blobPathname: blobResult?.pathname,
      blobUrl: blobResult?.url,
      blobDownloadUrl: blobResult?.downloadUrl,
    },
    options,
  );
}

module.exports = {
  buildPublicUrl,
  deleteFile,
  deleteFiles,
  getFileRecord,
  listFileHistory,
  listFiles,
  rotateShareLink,
  saveFileFromPath,
  saveFileRecord,
  saveSingleFile,
  sendFileResponse,
  sendSharedFile,
  streamBatchDownload,
  updateFileAccess,
};
