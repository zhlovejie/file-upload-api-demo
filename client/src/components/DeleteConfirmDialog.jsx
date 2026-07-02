import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "./ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.jsx";
import { getFileDisplayName } from "../utils/file.js";

function DeleteConfirmDialog({ isOpen, isDeleting, request, onCancel, onConfirm }) {
  const files = request?.files || [];
  const isBatch = request?.type === "batch";
  const title = isBatch ? "Delete selected files?" : "Delete this file?";
  const fileName = files[0] ? getFileDisplayName(files[0]) : "";

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-md gap-5" showClose={!isDeleting}>
        <DialogHeader className="gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md border border-red-200 bg-red-50 text-destructive">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="mt-2">
              {isBatch
                ? `${files.length} files will be removed from storage. This action cannot be undone.`
                : `"${fileName}" will be removed from storage. This action cannot be undone.`}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="rounded-md border border-sky-100 bg-sky-50/65 px-3 py-2 text-sm text-muted-foreground">
          {isBatch ? (
            <span className="font-medium text-foreground">
              {files.length} file{files.length === 1 ? "" : "s"} selected
            </span>
          ) : (
            <span className="block truncate font-medium text-foreground" title={fileName}>
              {fileName}
            </span>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" disabled={isDeleting} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" type="button" disabled={isDeleting} onClick={onConfirm}>
            <Trash2 aria-hidden="true" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DeleteConfirmDialog };
