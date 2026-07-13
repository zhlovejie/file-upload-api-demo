# Vercel quick demo deployment

This setup is only for a short Vercel demo. Uploaded files and chunk state are written to `/tmp`, so they are temporary and can disappear after a function cold start, redeploy, or instance change.

## What changed

- `api/index.js` exposes the Express app as a Vercel Function.
- `vercel.json` routes `/api/*`, `/health`, and `/static/*` to that function while letting Vercel serve `public/` as static assets.
- `src/app.js` no longer calls `listen()` when imported by Vercel.
- When `VERCEL=1`, storage defaults to `/tmp/storage/uploads` and `/tmp/storage/chunks`.
- When `VERCEL=1`, upload limits default to demo-safe values:
  - single file: 4 MB
  - chunk part: 2 MB
  - recommended chunk size: 1 MB
  - total chunk-upload file: 20 MB

## Deploy steps

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. Import the repository in Vercel.
3. Keep the build command as:

   ```bash
   npm run build
   ```

4. Keep the output directory as:

   ```text
   public
   ```

5. Add these Vercel environment variables after the first preview URL or production domain is known:

   ```dotenv
   PUBLIC_BASE_URL=https://your-project.vercel.app
   ALLOWED_ORIGINS=https://your-project.vercel.app
   MAX_SINGLE_FILE_SIZE_BYTES=4194304
   MAX_CHUNK_SIZE_BYTES=2097152
   DEFAULT_CHUNK_SIZE_BYTES=1048576
   MAX_CHUNK_UPLOAD_FILE_SIZE_BYTES=20971520
   ```

6. Redeploy.
7. Verify:

   ```text
   https://your-project.vercel.app/health
   https://your-project.vercel.app/index.html
   ```

## Demo caveats

- Uploaded files are not persistent.
- Chunk resume may fail if requests land on a different function instance.
- Large files should stay small for the demo. Use files under 20 MB for chunk upload.
- This is not a production storage architecture. For production, move files to object storage and metadata to a database.
