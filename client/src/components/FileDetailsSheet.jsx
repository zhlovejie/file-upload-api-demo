import {
  Copy,
  Download,
  ExternalLink,
  Eye,
  Link,
  LockKeyhole,
  RefreshCw,
  Trash2,
  Unlock,
} from "lucide-react";
import { Badge } from "./ui/badge.jsx";
import { Button } from "./ui/button.jsx";
import { Separator } from "./ui/separator.jsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs.jsx";
import { FileIcon } from "./FileIcon.jsx";
import { formatDateTime, formatFileSize, getFileDisplayName } from "../utils/file.js";

function DetailRow({ label, value, mono = false }) {
  const title = typeof value === "string" || typeof value === "number" ? String(value) : undefined;

  return (
    <div className="grid gap-1 rounded-md border border-sky-100 bg-sky-50/45 px-3 py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={mono ? "break-all text-sm tabular-nums" : "break-words text-sm"}
        title={title}
      >
        {value || "-"}
      </dd>
    </div>
  );
}

function PreviewFrame({ file }) {
  if (!file) {
    return null;
  }

  const src = file.previewUrl || file.publicUrl;
  const name = getFileDisplayName(file);

  if (file.fileType === "image") {
    return (
      <img
        className="max-h-[360px] w-full rounded-md border border-sky-200 bg-white object-contain"
        src={src}
        alt={name}
        title={name}
      />
    );
  }

  if (file.fileType === "video") {
    return (
      <video
        className="max-h-[360px] w-full rounded-md border border-sky-200 bg-white"
        src={src}
        title={name}
        controls
      >
        <track kind="captions" />
      </video>
    );
  }

  if (file.fileType === "pdf" || file.fileType === "text") {
    return (
      <iframe
        className="h-[360px] w-full rounded-md border border-sky-200 bg-white"
        title={`Preview ${name}`}
        src={src}
      />
    );
  }

  return (
    <div className="grid min-h-56 place-items-center rounded-md border border-sky-200 bg-sky-50/55 px-6 text-center">
      <div>
        <FileIcon fileType={file.fileType} />
        <p className="mt-3 text-sm font-medium text-foreground">
          Preview is not available for this file type.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Download the file to inspect it locally.
        </p>
      </div>
    </div>
  );
}

function HistoryList({ history }) {
  const scopedHistory = history.slice(0, 12);

  if (scopedHistory.length === 0) {
    return (
      <div className="rounded-md border border-sky-200 bg-sky-50/55 p-4 text-sm text-muted-foreground">
        No history recorded for this file yet.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {scopedHistory.map((entry) => (
        <li key={entry.id} className="rounded-md border border-sky-100 bg-white/82 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium capitalize text-foreground">
              {entry.action.replace(/-/g, " ")}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(entry.createdAt)}
            </span>
          </div>
          {entry.details ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {Array.isArray(entry.details)
                ? `${entry.details.length} item${entry.details.length === 1 ? "" : "s"}`
                : "Metadata changed"}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function FileDetailsSheet({
  file,
  history,
  isOpen,
  onClose,
  onCopyLink,
  onDelete,
  onRotateShareLink,
  onUpdateAccess,
}) {
  const privateLink = file?.shareUrl;
  const publicLink = file?.publicUrl;
  const activeLink = file?.visibility === "private" ? privateLink : publicLink;
  const scopedHistory = file
    ? history.filter((entry) => entry.storedFileName === file.storedFileName)
    : [];

  return (
    <Sheet open={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent className="flex overflow-hidden p-0 sm:max-w-2xl">
        {file ? (
          <div className="flex min-h-0 w-full flex-col">
            <SheetHeader className="border-b border-sky-100 bg-gradient-to-r from-white to-sky-50 px-6 py-5 pr-12">
              <div className="flex min-w-0 items-start gap-3">
                <FileIcon fileType={file.fileType} />
                <div className="min-w-0">
                  <SheetTitle className="truncate" title={getFileDisplayName(file)}>
                    {getFileDisplayName(file)}
                  </SheetTitle>
                  <SheetDescription className="mt-1 truncate" title={file.storedFileName}>
                    {file.storedFileName}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
              <Tabs defaultValue="preview">
                <TabsList>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-4">
                  <PreviewFrame file={file} />
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline">
                      <a
                        href={file.downloadUrl || file.publicUrl}
                        download={file.originalName}
                        title={`Download ${getFileDisplayName(file)}`}
                      >
                        <Download aria-hidden="true" />
                        Download
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      title={`Copy link${activeLink ? `: ${activeLink}` : ""}`}
                      onClick={() => onCopyLink(file)}
                    >
                      <Copy aria-hidden="true" />
                      Copy link
                    </Button>
                    <Button asChild variant="outline">
                      <a
                        href={activeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={activeLink}
                      >
                        <ExternalLink aria-hidden="true" />
                        Open link
                      </a>
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="flex items-center justify-between gap-3 rounded-md border border-sky-200 bg-sky-50/65 p-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Access</div>
                      <p className="text-sm text-muted-foreground">
                        Public files use the static URL. Private files use a tokenized link.
                      </p>
                    </div>
                    <Badge
                      variant={file.visibility === "private" ? "warning" : "success"}
                      className="gap-1.5"
                      title={file.visibility === "private" ? "Private link" : "Public"}
                    >
                      {file.visibility === "private" ? (
                        <LockKeyhole aria-hidden="true" className="h-3 w-3" />
                      ) : (
                        <Unlock aria-hidden="true" className="h-3 w-3" />
                      )}
                      {file.visibility === "private" ? "Private link" : "Public"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={file.visibility === "private" ? "secondary" : "outline"}
                      type="button"
                      title={`Make ${getFileDisplayName(file)} ${
                        file.visibility === "private" ? "public" : "private"
                      }`}
                      onClick={() =>
                        onUpdateAccess(file, file.visibility === "private" ? "public" : "private")
                      }
                    >
                      {file.visibility === "private" ? (
                        <Unlock aria-hidden="true" />
                      ) : (
                        <LockKeyhole aria-hidden="true" />
                      )}
                      Make {file.visibility === "private" ? "public" : "private"}
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      title={`Refresh private link${privateLink ? `: ${privateLink}` : ""}`}
                      onClick={() => onRotateShareLink(file)}
                    >
                      <RefreshCw aria-hidden="true" />
                      Refresh private link
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailRow label="File type" value={file.fileType} />
                    <DetailRow label="MIME type" value={file.mimeType} />
                    <DetailRow label="Size" value={formatFileSize(file.size)} mono />
                    <DetailRow label="Uploaded" value={formatDateTime(file.uploadedAt)} />
                    <DetailRow label="Extension" value={file.extension || "-"} />
                    <DetailRow label="Visibility" value={file.visibility} />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <DetailRow label="Active share link" value={activeLink} mono />
                    <DetailRow label="Public URL" value={publicLink} mono />
                    <DetailRow label="Private link" value={privateLink} mono />
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <HistoryList history={scopedHistory} />
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 bg-sky-50/45 px-6 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye aria-hidden="true" className="h-4 w-4" />
                File details
              </div>
              <Button variant="destructive" type="button" onClick={() => onDelete(file)}>
                <Trash2 aria-hidden="true" />
                Delete file
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export { FileDetailsSheet };
