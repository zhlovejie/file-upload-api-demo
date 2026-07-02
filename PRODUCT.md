# Product

Last updated: 2026-07-02

## Register

| Field | Value |
| --- | --- |
| Product name | `file-upload-api-demo` |
| Category | Standalone file upload API and file manager demo |
| Primary stack | Node.js, Express, React, Vite |
| Storage model | Local filesystem with JSON metadata |
| Current status | Portfolio-ready demo and integration starter |

## Product Purpose

`file-upload-api-demo` demonstrates a reusable upload module for teams that need reliable file intake and lightweight asset management without rebuilding their existing application. It provides the backend API, upload workflows, static file hosting, private sharing model, and browser UI needed to evaluate how the module would behave inside a client system.

The product is shaped as a technical tool, not a marketing page. The first screen focuses on uploaded files, searchable metadata, access controls, previews, and file operations.

## Target Users

| User | Needs |
| --- | --- |
| Client stakeholder | Quickly verify that upload, preview, download, sharing, and deletion workflows work end to end. |
| Full-stack developer | Inspect API contracts, storage behavior, validation rules, and extension points for production integration. |
| Admin/operator | Review uploaded assets, search files, manage access, rotate share links, and perform batch actions. |
| Freelance reviewer | Evaluate project quality, scope, and readiness from a running demo plus readable documentation. |

## Product Promise

Users can upload ordinary files or large files, recover interrupted chunk uploads, manage stored files from a browser, and safely distinguish public static files from private tokenized share links.

## Core User Jobs

- Upload a supported file and immediately receive usable access links.
- Upload a large file without depending on a single long-running request.
- Resume an interrupted large-file upload without retransmitting completed chunks.
- Find uploaded assets by name, type, date, size, or access state.
- Preview or download uploaded files.
- Make a file private and share it through a tokenized link.
- Rotate a private link when access should be refreshed.
- Delete one file or many files with confirmation.
- Download selected files as a ZIP archive.
- Review recent file activity.

## Functional Scope

### Included

- Single-file upload API.
- Large-file chunk upload API with init, status, part upload, and merge.
- Resume support using server metadata and browser task metadata.
- Local completed-file storage.
- Runtime JSON file index.
- Runtime JSON activity history.
- Public static file route.
- Public/private file visibility.
- Tokenized private preview and download links.
- File list API with search, filters, pagination, and sorting.
- File preview, download, delete, batch delete, and batch ZIP download.
- Scheduled cleanup for expired unfinished chunks.
- React file manager UI.
- Configurable API base URL in the browser UI.
- Responsive desktop table and mobile card layouts.

### Not Included Yet

- User accounts and login.
- Tenant, workspace, or project-level file ownership.
- Permission checks by role.
- Rate limiting and quotas.
- Malware scanning.
- Cloud object storage.
- Database-backed metadata.
- Multi-server upload coordination.
- CDN delivery.
- Thumbnail generation or media transcoding.
- Automated test suite.

## Product Experience

### Main Workspace

The main page opens directly into uploaded file management. It shows total file count, current-page size, public count, private count, a search/filter toolbar, file table, pagination, and a side history panel.

### Upload Dialog

Upload is available as a focused dialog with two workflows:

- Normal Single Upload for small and medium files.
- Large File Chunk Upload for bigger files that benefit from parallel chunks and resume handling.

Both workflows use drag-and-drop selection, status text, progress bars, reset controls, and result links.

### File Table

The table supports row selection, sorting, configurable columns, inline action buttons, and batch actions. On smaller screens it becomes a file-card list so the same operations remain reachable.

### Details Sheet

The details sheet is the inspection and control area for a single file. It includes:

- Preview tab for image, video, PDF, and text files.
- Details tab for metadata, active link, public URL, private link, and visibility controls.
- History tab scoped to the selected file.
- Download, copy link, open link, access toggle, private-link refresh, and delete actions.

### History Panel

The history panel shows recent operations such as uploads, deletions, batch downloads, access changes, and share-link rotations.

## API Contract Principles

- JSON endpoints return a consistent `success`, `message`, `data`, and `timestamp` shape.
- Error responses include a status code and optional details.
- File preview, file download, shared file access, and ZIP download return binary streams instead of the JSON wrapper.
- Public static files are served under `/static`.
- Private files must use tokenized share routes.
- File metadata always normalizes generated URLs from the configured `PUBLIC_BASE_URL`.

## Data Model

Uploaded file records expose:

- `id`
- `originalName`
- `storedFileName`
- `mimeType`
- `fileType`
- `extension`
- `size`
- `uploadedAt`
- `uploadId` when created from a chunk upload
- `visibility`
- `shareToken`
- `publicUrl`
- `previewUrl`
- `downloadUrl`
- `shareUrl`
- `shareDownloadUrl`

History records expose:

- `id`
- `action`
- `storedFileName`
- `originalName`
- `fileType`
- `size`
- `count`
- `details`
- `createdAt`

## Design Principles

- Put file management first; upload is a workflow inside the tool, not the whole product.
- Keep controls predictable and close to the data they affect.
- Make destructive actions explicit and confirmed.
- Make sharing state visible; public and private files should be easy to distinguish.
- Prefer dense, scannable information over decorative presentation.
- Support keyboard-accessible dialogs, focus states, semantic controls, and readable contrast.
- Keep the demo easy to run locally and easy to adapt for production storage.

## Brand Personality

Practical, trustworthy, clear, and implementation-ready. The interface should feel like a focused admin tool for file operations, with enough polish to reassure a client reviewer that the module is ready to adapt.

## Anti-References

Avoid landing-page hero sections, decorative feature cards, oversized marketing copy, vague upload states, ambiguous delete controls, hidden access rules, and UI that makes file operations feel playful or risky.

## Success Criteria

- A reviewer can run the app locally with `npm install`, `npm run build`, and `npm start`.
- A reviewer can upload, preview, download, share, and delete files from the UI.
- A reviewer can verify large-file chunk upload and resume behavior.
- A developer can understand the API surface from the documentation and source layout.
- A developer can identify where to replace local disk storage with cloud object storage.
- A stakeholder can see how the module would fit into an existing client system.

## Production Roadmap

The most valuable next upgrades are:

- Authentication and role-based permissions.
- Per-user or per-tenant file isolation.
- Object storage integration with AWS S3, Cloudflare R2, Google Cloud Storage, or Azure Blob Storage.
- Database-backed file records and audit logs.
- Redis or database-backed chunk upload state for multi-server deployments.
- Upload rate limits and abuse protection.
- Antivirus scanning and content moderation.
- CDN-backed public delivery.
- Image/video thumbnails and media metadata extraction.
- Background jobs for compression, transcoding, cleanup, and notifications.
