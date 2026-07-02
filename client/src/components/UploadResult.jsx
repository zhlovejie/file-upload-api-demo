import { formatFileSize } from "../utils/file.js";

function UploadResult({ file }) {
  if (!file) {
    return null;
  }

  const fileName = file.originalName || file.storedFileName;
  const isImage = file.mimeType?.startsWith("image/");

  return (
    <div className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
      <strong className="text-emerald-700">Upload completed</strong>
      <a
        className="break-all font-semibold text-primary underline-offset-4 hover:underline"
        href={file.publicUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={file.publicUrl}
      >
        {file.publicUrl}
      </a>
      {isImage ? (
        <img
          className="max-h-52 max-w-full rounded-md border bg-background object-contain"
          src={file.previewUrl || file.publicUrl}
          alt={fileName}
        />
      ) : (
        <span className="text-muted-foreground">
          {fileName} - {formatFileSize(file.size || 0)}
        </span>
      )}
    </div>
  );
}

export { UploadResult };
