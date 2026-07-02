import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Eye,
  Link,
  LockKeyhole,
  MoreHorizontal,
  Trash2,
  Unlock,
} from "lucide-react";
import { Badge } from "./ui/badge.jsx";
import { Button } from "./ui/button.jsx";
import { Checkbox } from "./ui/checkbox.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table.jsx";
import { FileIcon } from "./FileIcon.jsx";
import { formatDateTime, formatFileSize, getFileDisplayName } from "../utils/file.js";

const sortableColumns = {
  fileName: "File name",
  fileType: "Type",
  size: "Size",
  uploadedAt: "Uploaded",
  visibility: "Access",
};

function SortButton({ columnKey, label, sortBy, sortOrder, onSort }) {
  const isActive = sortBy === columnKey;
  const Icon = !isActive ? ArrowUpDown : sortOrder === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      className="inline-flex h-8 items-center gap-1 rounded-md px-1 text-xs font-semibold text-sky-800/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      type="button"
      title={`Sort by ${label}`}
      onClick={() => onSort(columnKey)}
    >
      {label}
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
  );
}

function SkeletonRows({ columnCount }) {
  return Array.from({ length: 6 }, (_, index) => (
    <TableRow key={index}>
      {Array.from({ length: columnCount }, (_, columnIndex) => (
        <TableCell key={columnIndex}>
          <div className="h-4 w-full max-w-40 rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

function EmptyState({ isLoading }) {
  return (
    <div className="grid min-h-72 place-items-center px-4 py-12 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg border border-sky-200 bg-sky-50 text-primary">
          <UploadIcon />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {isLoading ? "Loading uploaded files" : "No uploaded files found"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {isLoading
            ? "Reading the local upload directory and metadata index."
            : "Upload a file or adjust the filters to see matching assets."}
        </p>
      </div>
    </div>
  );
}

function UploadIcon() {
  return <span className="text-sm font-semibold text-muted-foreground">FU</span>;
}

function AccessBadge({ visibility }) {
  const isPrivate = visibility === "private";
  const label = isPrivate ? "Private link" : "Public";

  return (
    <Badge variant={isPrivate ? "warning" : "success"} className="gap-1.5" title={label}>
      {isPrivate ? (
        <LockKeyhole aria-hidden="true" className="h-3 w-3" />
      ) : (
        <Unlock aria-hidden="true" className="h-3 w-3" />
      )}
      {label}
    </Badge>
  );
}

function MobileFileCard({
  file,
  isSelected,
  onDelete,
  onOpenDetails,
  onSelectFile,
  onShare,
}) {
  const displayName = getFileDisplayName(file);
  const downloadUrl = file.downloadUrl || file.publicUrl;
  const shareUrl = file.visibility === "private" ? file.shareUrl : file.publicUrl;

  return (
    <article
      className="min-w-0 overflow-hidden rounded-md border border-sky-100 bg-white/84 p-3 shadow-sm"
      data-state={isSelected ? "selected" : undefined}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          aria-label={`Select ${displayName}`}
          checked={isSelected}
          onCheckedChange={(checked) => onSelectFile(file, Boolean(checked))}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={`${displayName}${file.storedFileName ? ` - ${file.storedFileName}` : ""}`}
          onClick={() => onOpenDetails(file)}
        >
          <FileIcon fileType={file.fileType} />
          <span className="min-w-0 flex-1">
            <span
              className="block max-w-full whitespace-normal break-words font-semibold leading-5 text-foreground [overflow-wrap:anywhere]"
              title={displayName}
            >
              {displayName}
            </span>
            <span
              className="mt-1 block max-w-full whitespace-normal break-words text-xs leading-4 text-muted-foreground [overflow-wrap:anywhere]"
              title={file.storedFileName}
            >
              {file.storedFileName}
            </span>
          </span>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-sky-50/65 px-2 py-1.5">
          <div className="text-xs font-medium text-muted-foreground">Type</div>
          <div className="mt-0.5 capitalize text-foreground">{file.fileType || "file"}</div>
        </div>
        <div className="rounded-md bg-sky-50/65 px-2 py-1.5">
          <div className="text-xs font-medium text-muted-foreground">Size</div>
          <div className="mt-0.5 tabular-nums text-foreground">{formatFileSize(file.size)}</div>
        </div>
        <div className="col-span-2 rounded-md bg-sky-50/65 px-2 py-1.5">
          <div className="text-xs font-medium text-muted-foreground">Uploaded</div>
          <div className="mt-0.5 text-foreground" title={formatDateTime(file.uploadedAt)}>
            {formatDateTime(file.uploadedAt)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <AccessBadge visibility={file.visibility} />
        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={`Download ${displayName}`}
          >
            <a href={downloadUrl} download={file.originalName} title={`Download ${displayName}`}>
              <Download aria-hidden="true" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label={`Copy share link for ${displayName}`}
            title={`Copy share link${shareUrl ? `: ${shareUrl}` : ""}`}
            onClick={() => onShare(file)}
          >
            <Link aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label={`View details for ${displayName}`}
            title={`View details for ${displayName}`}
            onClick={() => onOpenDetails(file)}
          >
            <Eye aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="text-destructive hover:bg-red-50 hover:text-destructive"
            aria-label={`Delete ${displayName}`}
            title={`Delete ${displayName}`}
            onClick={() => onDelete(file)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function UploadedFilesTable({
  columns,
  files,
  isLoading,
  page,
  pageSize,
  selectedIds,
  sortBy,
  sortOrder,
  onDelete,
  onOpenDetails,
  onSelectAll,
  onSelectFile,
  onShare,
  onSort,
}) {
  const visibleColumns = columns.filter((column) => column.visible);
  const selectedOnPage = files.filter((file) => selectedIds.has(file.storedFileName));
  const allSelected = files.length > 0 && selectedOnPage.length === files.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;
  const totalColumns = visibleColumns.length + 1;

  if (!isLoading && files.length === 0) {
    return <EmptyState isLoading={false} />;
  }

  return (
    <>
      <div className="grid gap-3 p-3 md:hidden">
        {isLoading && files.length === 0 ? (
          <div className="grid min-h-48 place-items-center rounded-md border border-sky-100 bg-sky-50/45 text-sm text-muted-foreground">
            Loading uploaded files...
          </div>
        ) : (
          files.map((file) => (
            <MobileFileCard
              key={file.id || file.storedFileName}
              file={file}
              isSelected={selectedIds.has(file.storedFileName)}
              onDelete={onDelete}
              onOpenDetails={onOpenDetails}
              onSelectFile={onSelectFile}
              onShare={onShare}
            />
          ))
        )}
      </div>

      <Table className="min-w-[1040px] table-fixed" containerClassName="hidden flex-1 md:block">
        <TableHeader className="sticky top-0 z-10 bg-sky-50/95 backdrop-blur">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                aria-label="Select all files on this page"
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
              />
            </TableHead>
            {visibleColumns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {sortableColumns[column.key] ? (
                  <SortButton
                    columnKey={column.key}
                    label={column.label}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                  />
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && files.length === 0 ? (
            <SkeletonRows columnCount={totalColumns} />
          ) : (
            files.map((file, index) => {
              const isSelected = selectedIds.has(file.storedFileName);
              const rowNumber = (page - 1) * pageSize + index + 1;
              const displayName = getFileDisplayName(file);
              const downloadUrl = file.downloadUrl || file.publicUrl;
              const shareUrl = file.visibility === "private" ? file.shareUrl : file.publicUrl;

              return (
                <TableRow
                  key={file.id || file.storedFileName}
                  data-state={isSelected ? "selected" : undefined}
                >
                  <TableCell className="w-12">
                    <Checkbox
                      aria-label={`Select ${displayName}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => onSelectFile(file, Boolean(checked))}
                    />
                  </TableCell>
                  {visibleColumns.map((column) => (
                    <TableCell key={column.key} className={column.cellClassName}>
                      {column.key === "index" ? (
                        <span className="text-muted-foreground tabular-nums">{rowNumber}</span>
                      ) : null}
                      {column.key === "fileName" ? (
                        <button
                          type="button"
                          className="flex min-w-0 max-w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title={`${displayName}${
                            file.storedFileName ? ` - ${file.storedFileName}` : ""
                          }`}
                          onClick={() => onOpenDetails(file)}
                        >
                          <FileIcon fileType={file.fileType} />
                          <span className="min-w-0">
                            <span
                              className="block truncate font-semibold text-foreground"
                              title={displayName}
                            >
                              {displayName}
                            </span>
                            <span
                              className="block truncate text-xs text-muted-foreground"
                              title={file.storedFileName}
                            >
                              {file.storedFileName}
                            </span>
                          </span>
                        </button>
                      ) : null}
                      {column.key === "fileType" ? (
                        <Badge
                          variant="secondary"
                          className="capitalize"
                          title={file.fileType || "file"}
                        >
                          {file.fileType || "file"}
                        </Badge>
                      ) : null}
                      {column.key === "size" ? (
                        <span className="tabular-nums">{formatFileSize(file.size)}</span>
                      ) : null}
                      {column.key === "uploadedAt" ? (
                        <span
                          className="text-muted-foreground"
                          title={formatDateTime(file.uploadedAt)}
                        >
                          {formatDateTime(file.uploadedAt)}
                        </span>
                      ) : null}
                      {column.key === "visibility" ? (
                        <AccessBadge visibility={file.visibility} />
                      ) : null}
                      {column.key === "actions" ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            aria-label={`Download ${displayName}`}
                          >
                            <a
                              href={downloadUrl}
                              download={file.originalName}
                              title={`Download ${displayName}`}
                            >
                              <Download aria-hidden="true" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            aria-label={`Copy share link for ${displayName}`}
                            title={`Copy share link${shareUrl ? `: ${shareUrl}` : ""}`}
                            onClick={() => onShare(file)}
                          >
                            <Link aria-hidden="true" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                aria-label={`More actions for ${displayName}`}
                                title={`More actions for ${displayName}`}
                              >
                                <MoreHorizontal aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onOpenDetails(file)}>
                                <Eye aria-hidden="true" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onShare(file)}>
                                <Link aria-hidden="true" />
                                Copy link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete(file)}
                              >
                                <Trash2 aria-hidden="true" />
                                Delete file
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : null}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </>
  );
}

export { UploadedFilesTable };
