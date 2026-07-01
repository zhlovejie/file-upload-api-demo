# file-upload-api-demo

## Project Introduction

`file-upload-api-demo` is a standalone file upload microservice demo built for freelance outsourcing scenarios. Many clients already have a frontend or backend system, but they need a decoupled upload module that can be integrated quickly without rewriting their existing architecture.

This demo solves common business problems around file upload workflows:

- A clean single file upload API for images, videos and documents.
- A large file chunk upload pipeline to reduce timeout and upload lag issues.
- Resume support so users do not need to retransmit finished chunks after a refresh or network interruption.
- Public static file URLs that can be embedded directly in a browser, admin panel or client application.
- Local disk storage for easy portfolio review, with clear extension points for cloud storage and production access control.

The repository is intentionally lightweight: no database, no frontend build process and no complex environment setup.

## Core Features

- Standalone upload service that can be integrated into existing client systems.
- Single file upload with extension whitelist, MIME validation and file size limit.
- Unique filename generation to prevent overwriting existing files.
- Large file chunk upload with init, parallel chunk upload, status lookup, resume and merge APIs.
- Automatic cleanup job for expired unmerged chunk folders.
- Public static asset hosting for images, videos and documents.
- Browser cache headers for static files.
- CORS configuration for separated frontend and backend deployments.
- Standard API response format for both success and error cases.
- Global error handling to keep the service stable.
- Readable request and upload progress logs.
- Standalone `index.html` demo page with drag-and-drop upload, progress bars, preview panel and clickable public URLs.

## Local Startup Guide

### 1. Install dependencies

```bash
npm install
```

### 2. Start the upload service

```bash
npm start
```

The server starts on:

```text
http://localhost:4000
```

Open the frontend demo page:

```text
http://localhost:4000/index.html
```

You can also open `public/index.html` directly in a browser. Keep the API Base field as `http://localhost:4000`.

### Optional development mode

```bash
npm run dev
```

## Configuration

All adjustable parameters are centralized in `src/config/index.js`.

Environment variables can override the defaults:

```bash
PORT=4000
PUBLIC_BASE_URL=http://localhost:4000
UPLOAD_DIR=storage/uploads
CHUNK_DIR=storage/chunks
MAX_SINGLE_FILE_SIZE_BYTES=52428800
MAX_CHUNK_UPLOAD_FILE_SIZE_BYTES=524288000
MAX_CHUNK_SIZE_BYTES=8388608
DEFAULT_CHUNK_SIZE_BYTES=2097152
ALLOWED_ORIGINS=*
CHUNK_EXPIRY_MS=86400000
CLEANUP_INTERVAL_MS=1800000
```

## REST API Documentation

### Health Check

```http
GET /health
```

Response example:

```json
{
  "success": true,
  "message": "File upload service is healthy.",
  "data": {
    "uptime": 18.51
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Read Upload Configuration

```http
GET /api/uploads/config
```

Response example:

```json
{
  "success": true,
  "message": "Upload configuration loaded successfully.",
  "data": {
    "maxSingleFileSizeBytes": 52428800,
    "maxChunkUploadFileSizeBytes": 524288000,
    "maxChunkSizeBytes": 8388608,
    "defaultChunkSizeBytes": 2097152,
    "allowedExtensions": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov", ".pdf"],
    "allowedMimeTypes": ["image/jpeg", "image/png", "video/mp4", "application/pdf"],
    "publicBaseUrl": "http://localhost:4000"
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Single File Upload

```http
POST /api/uploads/single
Content-Type: multipart/form-data
```

Request params:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| file | File | Yes | The file to upload. |

Response example:

```json
{
  "success": true,
  "message": "File uploaded successfully.",
  "data": {
    "originalName": "contract.pdf",
    "storedFileName": "1782450012345-a1b2c3d4e5f6.pdf",
    "mimeType": "application/pdf",
    "size": 245760,
    "publicUrl": "http://localhost:4000/static/1782450012345-a1b2c3d4e5f6.pdf"
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Initialize Large File Chunk Upload

```http
POST /api/uploads/chunks/init
Content-Type: application/json
```

Request body:

```json
{
  "fileName": "product-demo.mp4",
  "mimeType": "video/mp4",
  "fileSize": 73400320,
  "chunkSize": 2097152,
  "totalChunks": 35
}
```

Response example:

```json
{
  "success": true,
  "message": "Chunk upload task initialized.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "uploadedChunks": [],
    "expiresInMs": 86400000,
    "recommendedChunkSize": 2097152
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Upload One Chunk

```http
POST /api/uploads/chunks/:uploadId/part
Content-Type: multipart/form-data
```

Request params:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| chunk | File | Yes | Current chunk binary. |
| chunkIndex | Number | Yes | Zero-based chunk index. |

Response example:

```json
{
  "success": true,
  "message": "Chunk uploaded successfully.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "chunkIndex": 3,
    "uploadedChunks": [0, 1, 2, 3],
    "receivedChunks": 4,
    "totalChunks": 35
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Read Chunk Upload Status

```http
GET /api/uploads/chunks/:uploadId/status
```

Use this endpoint after a page refresh or network interruption to skip chunks already uploaded.

Response example:

```json
{
  "success": true,
  "message": "Upload status loaded successfully.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "status": "uploading",
    "originalName": "product-demo.mp4",
    "totalChunks": 35,
    "uploadedChunks": [0, 1, 2, 3],
    "missingChunks": [4, 5, 6]
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Merge Uploaded Chunks

```http
POST /api/uploads/chunks/:uploadId/merge
```

Response example:

```json
{
  "success": true,
  "message": "Chunks merged successfully.",
  "data": {
    "uploadId": "1782450012345-a1b2c3d4e5f6a7b8c9",
    "originalName": "product-demo.mp4",
    "storedFileName": "1782450099999-f6e5d4c3b2a1.mp4",
    "mimeType": "video/mp4",
    "size": 73400320,
    "publicUrl": "http://localhost:4000/static/1782450099999-f6e5d4c3b2a1.mp4"
  },
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

### Static File Access

```http
GET /static/:storedFileName
```

Uploaded files are served from the static route with browser cache headers and cross-origin resource access.

## Standard Error Response

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
  "timestamp": "2026-06-26T10:00:00.000Z"
}
```

## Production-Grade Upgrade Extensions

I can adapt this upload module for real client systems with:

- Cloud storage integration with AWS S3, Google Cloud Storage, Azure Blob Storage or Cloudflare R2.
- User file isolation by account, tenant, project or workspace.
- Upload rate limiting to protect backend resources.
- Thumbnail generation for images and videos.
- Token authentication and permission checks for private files.
- File compression and image optimization.
- Virus scanning and content moderation workflows.
- CDN integration for faster global static resource delivery.
- Redis or database-backed upload state for multi-server deployments.
- Background queue processing for file conversion and metadata extraction.

## Portfolio Blurb

I built a standalone Node.js file upload microservice demo that supports regular file uploads, large file chunk uploads, resume upload, static file hosting, validation, CORS, cleanup jobs and a no-build frontend demo page. It is designed as a reusable upload module for clients who want to integrate reliable file handling into an existing web or backend system without rebuilding their whole application.

## Pre-Sales Message Template

Hi, I have built a standalone file upload module that can be integrated into an existing web app or backend system. It supports normal uploads, large file chunk upload, resume after interruption, validation, public file URLs, static hosting and cleanup of unfinished chunks. I can adapt it to your project with cloud storage, user permissions, token authentication, rate limiting, thumbnails or compression based on your business needs.
