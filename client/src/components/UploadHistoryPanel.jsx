import { Clock, FileUp, RefreshCw } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { formatDateTime, formatFileSize } from "../utils/file.js";

function getHistoryLabel(action) {
  const labels = {
    uploaded: "Uploaded",
    deleted: "Deleted",
    "batch-deleted": "Batch deleted",
    "batch-downloaded": "Batch downloaded",
    "made-private": "Made private",
    "made-public": "Made public",
    "share-link-rotated": "Share link refreshed",
  };

  return labels[action] || action.replace(/-/g, " ");
}

function UploadHistoryPanel({ history, isLoading, onRefresh }) {
  return (
    <aside className="flex min-h-0 min-w-0 max-w-full flex-col self-start overflow-hidden rounded-lg border border-sky-200/80 bg-card/94 shadow-[0_18px_46px_rgba(30,89,160,0.12)]">
      <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-white to-sky-50/90 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Upload history</h2>
          <p className="mt-1 text-sm text-muted-foreground">Recent upload and file operations.</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label="Refresh upload history"
          onClick={onRefresh}
        >
          <RefreshCw aria-hidden="true" className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="max-h-[28.5rem] min-h-0 overflow-y-auto overflow-x-hidden p-3 [scrollbar-gutter:stable]">
        {history.length === 0 ? (
          <div className="grid min-h-40 place-items-center rounded-md border border-sky-200 bg-sky-50/55 px-4 text-center text-sm text-muted-foreground">
            <div>
              <Clock aria-hidden="true" className="mx-auto mb-2 h-5 w-5" />
              No upload history yet.
            </div>
          </div>
        ) : (
          <ol className="space-y-2">
            {history.map((entry) => (
              <li key={entry.id} className="min-h-20 rounded-md border border-sky-100 bg-white/82 p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sky-100 text-primary">
                    <FileUp aria-hidden="true" className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium text-foreground" title={getHistoryLabel(entry.action)}>
                        {getHistoryLabel(entry.action)}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground" title={formatDateTime(entry.createdAt)}>
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <p
                      className="mt-1 truncate text-sm text-muted-foreground"
                      title={entry.originalName || `${entry.count || 0} files`}
                    >
                      {entry.originalName || `${entry.count || 0} files`}
                    </p>
                    {entry.size ? (
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {formatFileSize(entry.size)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}

export { UploadHistoryPanel };
