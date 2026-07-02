# file-upload-api-demo Deliverables

Last updated: 2026-07-02

## Delivery Summary

`file-upload-api-demo` is delivered as a standalone Node.js/Express upload service with a Vite React file-manager UI. It supports normal uploads, large-file chunk uploads, resumable upload recovery, local static asset hosting, public/private access control, tokenized private sharing, file search and filtering, preview/download operations, batch delete/download, lightweight history tracking, and scheduled cleanup of expired chunk tasks.

The project is intentionally database-free. Completed files and runtime metadata are stored on the local filesystem so the demo can be installed, reviewed, and adapted quickly.

## Delivered Artifacts

| Artifact | Path | Delivered |
| --- | --- | --- |
| Express application bootstrap | `src/app.js` | Yes |
| Runtime configuration | `src/config/index.js` | Yes |
| Upload/file API routes | `src/routes/uploadRoutes.js` | Yes |
| Upload controllers | `src/controllers/uploadController.js` | Yes |
| File service and metadata index | `src/services/fileService.js` | Yes |
| Chunk upload service | `src/services/chunkService.js` | Yes |
| Multer upload middleware | `src/middleware/upload.js` | Yes |
| Response and error middleware | `src/middleware/response.js`, `src/middleware/errorHandler.js` | Yes |
| Cleanup job | `src/jobs/cleanupChunks.js` | Yes |
| Shared utilities | `src/utils/*` | Yes |
| React frontend source | `client/src/*` | Yes |
| Vite build config | `client/vite.config.js` | Yes |
| Built frontend assets | `public/index.html`, `public/assets/*` | Yes |
| Runtime storage placeholders | `storage/uploads/.gitkeep`, `storage/chunks/.gitkeep` | Yes |
| Project documentation | `README.md`, `README_CN.md`, `PRODUCT.md`, `DELIVERABLES.md` | Yes |

## Feature Inventory

### Upload Workflows

- Single-file upload through `multipart/form-data`.
- Large-file chunk upload with initialize, status lookup, chunk part upload, and merge steps.
- Frontend chunk upload concurrency of 4 workers.
- Frontend chunk retry handling with 3 attempts per failed part.
- Resume support using server-side chunk metadata plus browser `localStorage`.
- Reuse of matching unfinished chunk tasks when file name, MIME type, size, chunk size, and chunk count match.
- Strict backend validation for file extension, MIME type, file size, chunk size, chunk index, and expected chunk byte length.
- Unique stored filenames to avoid overwriting existing uploads.

### File Management

- Paginated uploaded file list.
- Keyword search across original name, stored name, file type, and extension.
- Filters for file type, visibility, uploaded date range, and size range.
- Sorting by file name, file type, upload time, file size, and visibility.
- File details endpoint with normalized metadata and generated access links.
- Inline preview for image, video, PDF, and text files.
- Download endpoint using the original filename.
- Single delete and batch delete with per-file results.
- Batch ZIP download for selected files.
- Lightweight operation history for upload, delete, batch delete, batch download, access changes, and share-link rotation.

### Access and Sharing

- Public files are available through `/static/:storedFileName`.
- Private files are blocked from `/static/:storedFileName`.
- Private files use tokenized preview and download links.
- Access can be switched between `public` and `private`.
- Private share tokens can be rotated.
- File records expose public, preview, download, share, and share-download URLs.

### Frontend Experience

- File-manager-first dashboard with upload as a dialog workflow.
- Configurable API base URL field.
- Search and filter toolbar with advanced filters.
- Desktop table with selectable rows, configurable columns, sorting, and batch actions.
- Mobile file cards for small viewports.
- Upload dialog with normal upload and large-file chunk upload tabs.
- Drag-and-drop file selection.
- Progress indicators and upload status messages.
- File details sheet with Preview, Details, and History tabs.
- Upload history side panel.
- Delete confirmation dialog.
- Toast notifications.
- Browser persistence for visible columns and unfinished chunk tasks.

## API Surface

Base API path:

```text
/api/uploads
```

| Method | Route | Delivered behavior |
| --- | --- | --- |
| `GET` | `/health` | Service health check with uptime. |
| `GET` | `/api/uploads/config` | Returns upload limits, allowed extensions, allowed MIME types, and public base URL. |
| `POST` | `/api/uploads/single` | Uploads one validated file. |
| `POST` | `/api/uploads/chunks/init` | Creates or resumes a chunk upload task. |
| `GET` | `/api/uploads/chunks/:uploadId/status` | Returns uploaded and missing chunk indexes. |
| `POST` | `/api/uploads/chunks/:uploadId/part` | Uploads one chunk part. |
| `POST` | `/api/uploads/chunks/:uploadId/merge` | Merges all parts, verifies final size, saves file record, removes temp folder. |
| `GET` | `/api/uploads/files` | Lists uploaded files with search, filters, pagination, and sorting. |
| `GET` | `/api/uploads/files/:storedFileName` | Reads one file record. |
| `GET` | `/api/uploads/files/:storedFileName/preview` | Streams a file inline. |
| `GET` | `/api/uploads/files/:storedFileName/download` | Downloads a file as an attachment. |
| `PATCH` | `/api/uploads/files/:storedFileName/access` | Updates file visibility and optionally rotates the share token. |
| `POST` | `/api/uploads/files/:storedFileName/share` | Rotates the private share token. |
| `GET` | `/api/uploads/share/:token` | Previews a tokenized shared file. |
| `GET` | `/api/uploads/share/:token/download` | Downloads a tokenized shared file. |
| `DELETE` | `/api/uploads/files/:storedFileName` | Deletes one uploaded file. |
| `POST` | `/api/uploads/files/batch-delete` | Deletes multiple files and returns per-file results. |
| `POST` | `/api/uploads/files/batch-download` | Streams selected files as a ZIP archive. |
| `GET` | `/api/uploads/history` | Lists recent upload/file activity. |
| `GET` | `/static/:storedFileName` | Serves public uploaded files with cache and cross-origin headers. |

## Runtime Data Outputs

| Runtime data | Location | Notes |
| --- | --- | --- |
| Completed files | `storage/uploads/` | Ignored by Git except `.gitkeep`. |
| File index | `storage/uploads/.file-index.json` | Generated at runtime. Stores normalized records, visibility, and share tokens. |
| File history | `storage/uploads/.file-history.json` | Generated at runtime. Keeps the latest 500 history entries. |
| Chunk task folders | `storage/chunks/:uploadId/` | Generated at runtime. Contains `metadata.json` and `*.part` files. |
| Frontend chunk tasks | Browser `localStorage:fileUploadChunkTasks` | Used to resume unfinished uploads from the same browser. |
| Frontend visible columns | Browser `localStorage:file-upload-demo.visible-columns` | Used to persist table column choices. |

## Configuration

Configuration is centralized in `src/config/index.js` and can be overridden with environment variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | Express server port. |
| `PUBLIC_BASE_URL` | `http://localhost:4000` | Base URL used to generate file and share links. |
| `UPLOAD_DIR` | `storage/uploads` | Completed upload storage and metadata index directory. |
| `CHUNK_DIR` | `storage/chunks` | Temporary chunk upload task directory. |
| `MAX_SINGLE_FILE_SIZE_BYTES` | `104857600` | Maximum normal upload size, 100 MB. |
| `MAX_CHUNK_UPLOAD_FILE_SIZE_BYTES` | `5368709120` | Maximum chunk-upload file size, 5 GB. |
| `MAX_CHUNK_SIZE_BYTES` | `5242880` | Maximum individual chunk size, 5 MB. |
| `DEFAULT_CHUNK_SIZE_BYTES` | `2097152` | Recommended chunk size, 2 MB. |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS allowlist. |
| `CHUNK_EXPIRY_MS` | `86400000` | Expiry time for unfinished chunk uploads, 24 hours. |
| `CLEANUP_INTERVAL_MS` | `1800000` | Cleanup job interval, 30 minutes. |
| `LOG_FORMAT` | `dev` | Morgan request log format. |

Allowed extensions:

```text
.jpg, .jpeg, .png, .gif, .webp, .mp4, .mov, .pdf, .doc, .docx, .xls, .xlsx, .txt, .csv, .zip
```

Allowed MIME types cover common images, videos, PDF, Word, Excel, text, CSV, and ZIP files.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm install` | Install backend and frontend dependencies. |
| `npm start` | Start the Express service from `src/app.js`. |
| `npm run dev` | Start the Express service with Node watch mode. |
| `npm run client:dev` | Start the Vite React dev server on port `5173`. |
| `npm run build` | Build the React UI into `public/`. |

## Acceptance Checklist

Use this checklist to verify the delivered demo locally.

1. Run `npm install`.
2. Run `npm run build`.
3. Run `npm start`.
4. Open `http://localhost:4000/index.html`.
5. Call `GET http://localhost:4000/health` and confirm a successful JSON response.
6. Upload a supported small file through the Normal Single Upload workflow.
7. Upload a larger supported file through the Large File Chunk Upload workflow.
8. Interrupt and resume a chunk upload from the same browser to confirm resume behavior.
9. Confirm the uploaded file appears in the table and can be searched, filtered, sorted, previewed, downloaded, and deleted.
10. Switch a file to private, confirm `/static/:storedFileName` returns `403`, and confirm the tokenized share link still works.
11. Rotate a private share link and confirm the file record updates.
12. Select multiple files and confirm batch ZIP download and batch delete behavior.
13. Confirm upload/file activity appears in the history panel.
14. Confirm runtime files are written under `storage/uploads` and unfinished chunks under `storage/chunks`.

## Current Limits and Production Upgrade Points

The demo is complete for portfolio and integration review, but it is not a hardened production file platform by itself.

- Authentication and authorization are not included.
- Per-user, per-tenant, and per-project file isolation are not included.
- Rate limiting, request quotas, and abuse protection are not included.
- Virus scanning and content moderation are not included.
- Cloud object storage is not wired in yet.
- Multi-server metadata persistence is not included.
- CDN integration, thumbnail generation, media transcoding, and background queues are not included.
- Automated tests are not included; use the acceptance checklist for manual verification.

Recommended production upgrades include S3/R2/GCS/Azure Blob storage, database-backed file indexes, Redis or database-backed chunk state, token authentication, permission checks, rate limiting, antivirus scanning, CDN delivery, and queue-based media processing.

## Handover Notes

- The backend and frontend are in the same npm project.
- The React source lives under `client/` and builds into `public/`.
- The Express app serves both the API and the built frontend.
- No database is required for local review.
- Runtime uploads are intentionally ignored by Git.
- The service can be adapted into an existing application as a separate asset service or as reusable upload/file-management routes.
