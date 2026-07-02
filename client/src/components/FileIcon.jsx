import {
  Archive,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
} from "lucide-react";
import { cn } from "../lib/utils.js";

const iconMap = {
  archive: Archive,
  document: FileText,
  image: FileImage,
  pdf: FileType,
  spreadsheet: FileSpreadsheet,
  text: FileText,
  video: FileVideo,
};

function FileIcon({ fileType }) {
  const Icon = iconMap[fileType] || File;

  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
        fileType === "image" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        fileType === "video" && "border-violet-200 bg-violet-50 text-violet-700",
        fileType === "pdf" && "border-red-200 bg-red-50 text-red-700",
        fileType === "spreadsheet" && "border-teal-200 bg-teal-50 text-teal-700",
        fileType === "archive" && "border-amber-200 bg-amber-50 text-amber-700",
        !["image", "video", "pdf", "spreadsheet", "archive"].includes(fileType) &&
          "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      <Icon aria-hidden="true" size={17} strokeWidth={2} />
    </span>
  );
}

export { FileIcon };
