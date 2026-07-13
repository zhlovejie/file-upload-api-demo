# file-upload-api-demo

> 📹 **[Live demo](https://file-upload-api-demo.vercel.app/)** *(https://file-upload-api-demo.vercel.app/)*

Standalone file upload service demo built with Node.js, Express, and a Vite React frontend. It is designed as a reusable upload module for existing web applications: the backend can run as an independent asset service, while the included UI demonstrates upload, file management, preview, sharing, and batch operations.

## What It Does

- Upload normal files through a simple `multipart/form-data` API.
- Upload large files in chunks with init, status, parallel part upload, resume, and merge steps.
- Resume interrupted chunk uploads from both server-side chunk metadata and browser `localStorage`.
- Validate file extension, MIME type, file size, chunk size, and chunk index.
- Store completed files on local disk with unique generated filenames.
- Serve public files through `/static/:storedFileName` with cache and cross-origin headers.
- Mark files as `public` or `private`; private files use tokenized share and download links.
- List uploaded files with keyword search, filters, pagination, sorting, and metadata.
- Preview, download, delete, batch delete, and batch ZIP-download uploaded files.
- Track upload/file activity in a lightweight local history file.
- Clean up expired unfinished chunk upload folders on a schedule.
- Provide a React file manager UI built into `public/` for quick review and demos.

No database is required. Runtime metadata is persisted as JSON files in the upload directory.

## Tech Stack

- Backend: Node.js, Express, Multer, Helmet, CORS, Morgan, Archiver
- Frontend: React, Vite, Radix UI primitives, Lucide icons, Tailwind CSS
- Storage: local filesystem by default

## Project Structure

```text
src/
  app.js                       Express app, middleware, static hosting, bootstrap
  config/index.js              Runtime configuration and environment defaults
  controllers/uploadController.js
  routes/uploadRoutes.js       Upload and file-management API routes
  services/fileService.js      File records, access links, history, download streams
  services/chunkService.js     Chunk task metadata, resume, part save, merge
  middleware/                  Upload parsing, responses, errors
  jobs/cleanupChunks.js        Scheduled cleanup for expired chunk tasks
client/
  src/                         React upload/file-manager source
  vite.config.js               Builds the client into public/
public/                        Built frontend served by Express
storage/
  uploads/                     Completed files and local JSON indexes
  chunks/                      Temporary chunk upload folders
```

## Quick Start

Install dependencies:

```bash
npm install
```

Start the Express service:

```bash
npm start
```

Open the built demo UI:

```text
http://localhost:4000/index.html
```

The API base URL defaults to the current browser origin. For local testing it should be:

```text
http://localhost:4000
```

## Docker Deployment

The project includes a production `Dockerfile` and `docker-compose.yml`. The Docker image builds the React UI into `public/`, installs production Node dependencies, runs as a non-root user, and stores runtime files under `/app/storage`.

Start with Docker Compose:

```bash
docker compose up -d --build
```

Open the demo UI:

```text
http://localhost:4000/index.html
```

Check service health:

```bash
curl http://localhost:4000/health
```

View logs:

```bash
docker compose logs -f file-upload-api
```

Stop the service while keeping uploaded files:

```bash
docker compose down
```

Remove containers and uploaded data volumes:

```bash
docker compose down -v
```

### Docker Environment

`docker-compose.yml` reads these common environment variables from your shell or an optional `.env` file:

| Variable | Default | Description |
| --- | --- | --- |
| `APP_PORT` | `4000` | Host port mapped to container port `4000`. |
| `PUBLIC_BASE_URL` | `http://localhost:4000` | Public base URL used to generate file links. Set this to your real domain or host port in deployment. |
| `MAX_SINGLE_FILE_SIZE_BYTES` | `104857600` | Maximum normal upload size. |
| `MAX_CHUNK_UPLOAD_FILE_SIZE_BYTES` | `5368709120` | Maximum chunk-upload file size. |
| `MAX_CHUNK_SIZE_BYTES` | `5242880` | Maximum chunk part size. |
| `DEFAULT_CHUNK_SIZE_BYTES` | `2097152` | Recommended client chunk size. |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS allowlist. |
| `CHUNK_EXPIRY_MS` | `86400000` | Expiry time for unfinished chunk uploads. |
| `CLEANUP_INTERVAL_MS` | `1800000` | Cleanup job interval. |
| `LOG_FORMAT` | `combined` | Morgan request log format used in Docker. |

Example `.env`:

```dotenv
APP_PORT=8080
PUBLIC_BASE_URL=http://localhost:8080
ALLOWED_ORIGINS=http://localhost:8080
```

Compose persists completed uploads and chunk tasks in named volumes:

```text
upload_data -> /app/storage/uploads
chunk_data  -> /app/storage/chunks
```

### Docker Run Without Compose

Build the image:

```bash
docker build -t file-upload-api-demo:latest .
```

Run the container:

```bash
docker run -d \
  --name file-upload-api-demo \
  -p 4000:4000 \
  -e PUBLIC_BASE_URL=http://localhost:4000 \
  -v file_upload_storage:/app/storage \
  file-upload-api-demo:latest
```

## Development

Run the backend with Node watch mode:

```bash
npm run dev
```

Run the React dev server in a second terminal:

```bash
npm run client:dev
```

The Vite dev server runs at:

```text
http://localhost:5173
```

During frontend development, Vite proxies `/api` and `/static` to `http://localhost:4000`.

Build the React app into `public/`:

```bash
npm run build
```

## Configuration

Configuration lives in `src/config/index.js` and can be overridden with environment variables.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | Express server port. |
| `PUBLIC_BASE_URL` | `http://localhost:4000` | Base URL used to generate public, preview, download, and share links. |
| `UPLOAD_DIR` | `storage/uploads` | Directory for completed uploaded files and file indexes. |
| `CHUNK_DIR` | `storage/chunks` | Directory for temporary chunk upload tasks. |
| `MAX_SINGLE_FILE_SIZE_BYTES` | `104857600` | Maximum normal upload size, 100 MB by default. |
| `MAX_CHUNK_UPLOAD_FILE_SIZE_BYTES` | `5368709120` | Maximum large-file upload size, 5 GB by default. |
| `MAX_CHUNK_SIZE_BYTES` | `5242880` | Maximum chunk part size, 5 MB by default. |
| `DEFAULT_CHUNK_SIZE_BYTES` | `2097152` | Recommended chunk size, 2 MB by default. |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS allowlist. |
| `CHUNK_EXPIRY_MS` | `86400000` | Expiry time for unfinished chunk uploads, 24 hours by default. |
| `CLEANUP_INTERVAL_MS` | `1800000` | Cleanup job interval, 30 minutes by default. |
| `LOG_FORMAT` | `dev` | Morgan request log format. |

Allowed extensions:

```text
.jpg, .jpeg, .png, .gif, .webp, .mp4, .mov, .pdf, .doc, .docx, .xls, .xlsx, .txt, .csv, .zip
```

Allowed MIME types include common image, video, PDF, Word, Excel, text, CSV, and ZIP formats.

## Frontend Demo

The included React UI provides:

- Normal upload and large-file chunk upload tabs.
- Drag-and-drop file selection.
- Upload progress and status messaging.
- Chunk upload resume using browser-stored task metadata.
- File table with selectable rows, configurable columns, pagination, and sorting.
- Keyword search plus filters for file type, access, upload date, and size range.
- Public/private access switching.
- Tokenized private share link rotation.
- Preview, copy link, download, delete, batch delete, and batch ZIP download.
- Upload history side panel.

## Screenshots

The `screenshot/` directory contains the current project captures for the built-in `BlockArchive` demo UI.

### File Manager Dashboard

![Uploaded files table and upload history](screenshot/1.png)

The main dashboard shows uploaded files, summary badges, keyword search, file type and access filters, sortable columns, per-file actions, pagination, and the upload history panel.

### Advanced Search and Batch Actions

![Advanced search and selected batch actions](screenshot/2.png)

Advanced search adds upload date and file size filters. Selecting rows reveals batch ZIP download and batch delete actions for bulk file management.

### Upload Dialog and Chunk Progress

![Upload dialog with large file chunk upload progress](screenshot/3.png)

The upload dialog supports both normal single-file upload and large-file chunk upload. The chunk upload flow shows progress, upload status, and resume controls.

### Completed Chunk Upload

![Completed large file chunk upload](screenshot/4.png)

After all chunks are uploaded and merged, the UI displays a completed status with the generated static file URL and the final uploaded file metadata.

### File Preview Drawer

![Image preview drawer with actions](screenshot/5.png)

The preview drawer lets users inspect supported files inline, switch between preview/details/history tabs, download the file, copy or open the link, and delete the file.

## API Response Format

Successful JSON responses use:

```json
{
  "success": true,
  "message": "Success message.",
  "data": {},
  "timestamp": "2026-07-01T00:00:00.000Z"
}
```

Errors use:

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
  "timestamp": "2026-07-01T00:00:00.000Z"
}
```

File streaming and ZIP download endpoints return binary responses instead of the JSON wrapper.

## REST API

Base upload API path:

```text
/api/uploads
```

### Health Check

```http
GET /health
```

### Read Upload Configuration

```http
GET /api/uploads/config
```

Returns upload limits, allowed extensions/MIME types, and the configured public base URL.

### Upload One File

```http
POST /api/uploads/single
Content-Type: multipart/form-data
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | File | Yes | File to upload. |

### Initialize Chunk Upload

```http
POST /api/uploads/chunks/init
Content-Type: application/json
```

```json
{
  "fileName": "product-demo.mp4",
  "mimeType": "video/mp4",
  "fileSize": 73400320,
  "chunkSize": 2097152,
  "totalChunks": 35
}
```

If an unfinished matching upload task exists, the service returns the existing `uploadId`, uploaded chunk indexes, and `resumed: true`.

### Read Chunk Upload Status

```http
GET /api/uploads/chunks/:uploadId/status
```

Returns the task status, uploaded chunk indexes, and missing chunk indexes.

### Upload One Chunk

```http
POST /api/uploads/chunks/:uploadId/part
Content-Type: multipart/form-data
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `chunk` | File | Yes | Binary chunk data. |
| `chunkIndex` | Number | Yes | Zero-based chunk index. |

The backend checks that each chunk size matches the expected byte range. The final chunk may be smaller.

### Merge Uploaded Chunks

```http
POST /api/uploads/chunks/:uploadId/merge
```

Merges all parts in numeric order, verifies the final file size, saves the completed file record, and removes the temporary chunk folder.

### List Uploaded Files

```http
GET /api/uploads/files?page=1&pageSize=20&keyword=demo&sortBy=uploadedAt&sortOrder=desc
```

Supported query parameters:

| Parameter | Description |
| --- | --- |
| `page` | Page number, starting from `1`. |
| `pageSize` | One of `20`, `30`, `50`, or `100`. |
| `keyword` | Searches original name, stored name, file type, and extension. |
| `sortBy` | `fileName`, `fileType`, `uploadedAt`, `size`, or `visibility`. |
| `sortOrder` | `asc` or `desc`. |
| `fileType` | `image`, `video`, `pdf`, `document`, `spreadsheet`, `archive`, `text`, or `all`. |
| `visibility` | `public`, `private`, or `all`. |
| `uploadedFrom` | Inclusive upload date filter. |
| `uploadedTo` | Inclusive upload date filter. |
| `minSize` | Minimum file size in bytes. |
| `maxSize` | Maximum file size in bytes. |

### Read One File Record

```http
GET /api/uploads/files/:storedFileName
```

### Preview One File

```http
GET /api/uploads/files/:storedFileName/preview
```

Streams the file inline.

### Download One File

```http
GET /api/uploads/files/:storedFileName/download
```

Downloads the file as an attachment using the original filename.

### Update File Access

```http
PATCH /api/uploads/files/:storedFileName/access
Content-Type: application/json
```

```json
{
  "visibility": "private",
  "rotateShareToken": true
}
```

`visibility` can be `public` or `private`. When a file is private, `/static/:storedFileName` is blocked and clients should use the tokenized share link.

### Rotate Private Share Link

```http
POST /api/uploads/files/:storedFileName/share
```

Generates a new share token and returns updated `shareUrl` and `shareDownloadUrl` values.

### Preview Shared File

```http
GET /api/uploads/share/:token
```

### Download Shared File

```http
GET /api/uploads/share/:token/download
```

### Delete One File

```http
DELETE /api/uploads/files/:storedFileName
```

### Batch Delete Files

```http
POST /api/uploads/files/batch-delete
Content-Type: application/json
```

```json
{
  "storedFileNames": ["file-a.pdf", "file-b.png"]
}
```

Returns per-file success/failure details.

### Batch Download Files

```http
POST /api/uploads/files/batch-download
Content-Type: application/json
```

```json
{
  "storedFileNames": ["file-a.pdf", "file-b.png"]
}
```

Streams a ZIP archive containing the available selected files.

### List Upload History

```http
GET /api/uploads/history?limit=80
```

Optional query parameters:

| Parameter | Description |
| --- | --- |
| `limit` | Number of records to return, from `1` to `200`. |
| `storedFileName` | Filter history for one stored file. |

## Static File Access

Public files can be accessed directly:

```http
GET /static/:storedFileName
```

Static responses include cache headers and cross-origin resource headers. Private files return `403` on this route and must be accessed through their share URL.

## Stored File Record

Upload and file-list endpoints return records shaped like:

```json
{
  "id": "1782450099999-f6e5d4c3b2a1.pdf",
  "originalName": "contract.pdf",
  "storedFileName": "1782450099999-f6e5d4c3b2a1.pdf",
  "mimeType": "application/pdf",
  "fileType": "pdf",
  "extension": ".pdf",
  "size": 245760,
  "uploadedAt": "2026-07-01T00:00:00.000Z",
  "visibility": "public",
  "publicUrl": "http://localhost:4000/static/1782450099999-f6e5d4c3b2a1.pdf",
  "previewUrl": "http://localhost:4000/api/uploads/files/1782450099999-f6e5d4c3b2a1.pdf/preview",
  "downloadUrl": "http://localhost:4000/api/uploads/files/1782450099999-f6e5d4c3b2a1.pdf/download",
  "shareUrl": "http://localhost:4000/api/uploads/share/<token>",
  "shareDownloadUrl": "http://localhost:4000/api/uploads/share/<token>/download"
}
```

## Storage Notes

- Completed files are written to `storage/uploads` by default.
- File records are stored in `storage/uploads/.file-index.json`.
- File activity is stored in `storage/uploads/.file-history.json`.
- Temporary chunk tasks are stored under `storage/chunks/:uploadId`.
- The cleanup job removes expired unfinished chunk folders based on `CHUNK_EXPIRY_MS`.

For production use, replace local disk writes with object storage such as AWS S3, Cloudflare R2, Google Cloud Storage, or Azure Blob Storage. For multi-server deployments, move file indexes and chunk task state into a database, Redis, or cloud multipart upload state.

## Production Upgrade Ideas

- Authentication and per-user or per-tenant file isolation.
- Permission checks for upload, list, preview, download, share, and delete operations.
- Rate limiting and request quotas.
- Virus scanning and content moderation.
- Image/video thumbnails and media metadata extraction.
- CDN integration for public assets.
- Background queues for conversion, compression, and cleanup.
- Database-backed audit history.

## Portfolio Summary

This project demonstrates a complete standalone upload module: normal upload, large-file chunk upload, resume support, local static hosting, private share links, file management, batch operations, validation, cleanup jobs, and a React demo UI. It can be adapted into an existing client system without requiring a database or a full application rewrite.
