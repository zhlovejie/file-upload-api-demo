import { DropZone } from "./DropZone.jsx";
import { ProgressBar } from "./ProgressBar.jsx";
import { UploadResult } from "./UploadResult.jsx";
import { Button } from "./ui/button.jsx";

function UploadPanel({
  title,
  dropIcon,
  dropTitle,
  dropNote,
  fileInputLabel,
  selectedFile,
  progress,
  status,
  isUploading,
  primaryActionLabel,
  secondaryActions,
  result,
  onFileSelected,
  onPrimaryAction,
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-sky-200 bg-card/95 shadow-sm">
      <div className="border-b border-sky-100 bg-sky-50/70 px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <DropZone
          icon={dropIcon}
          title={dropTitle}
          note={dropNote}
          inputLabel={fileInputLabel}
          inputKey={selectedFile}
          onFileSelected={onFileSelected}
        />
        <div className="min-h-6 truncate text-sm text-muted-foreground" title={selectedFile}>
          {selectedFile}
        </div>
        <ProgressBar progress={progress} status={status} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={isUploading}
            onClick={onPrimaryAction}
          >
            {primaryActionLabel}
          </Button>
          {secondaryActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
        <UploadResult file={result} />
      </div>
    </article>
  );
}

export { UploadPanel };
