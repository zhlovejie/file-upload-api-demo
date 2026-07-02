import { useState } from "react";
import {
  ChevronDown,
  Columns3,
  Download,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "./ui/button.jsx";
import { Checkbox } from "./ui/checkbox.jsx";
import { DatePickerField } from "./DatePickerField.jsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.jsx";
import { Input } from "./ui/input.jsx";
import { Label } from "./ui/label.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.jsx";
import { fileSizeToBytes } from "../utils/file.js";

const fileTypeOptions = [
  { label: "All types", value: "all" },
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
  { label: "PDF", value: "pdf" },
  { label: "Documents", value: "document" },
  { label: "Spreadsheets", value: "spreadsheet" },
  { label: "Archives", value: "archive" },
  { label: "Text", value: "text" },
];

const visibilityOptions = [
  { label: "All access", value: "all" },
  { label: "Public", value: "public" },
  { label: "Private link", value: "private" },
];

function getActiveAdvancedFilterCount(filters) {
  return [
    filters.uploadedFrom,
    filters.uploadedTo,
    filters.minSize,
    filters.maxSize,
  ].filter(Boolean).length;
}

function bytesToMbInput(value) {
  if (value === "" || value === undefined || value === null) {
    return "";
  }

  return String(Math.round((Number(value) / (1024 * 1024)) * 10) / 10);
}

function FileToolbar({
  apiBaseUrl,
  columns,
  filters,
  isLoading,
  keyword,
  selectedCount,
  onApiBaseUrlChange,
  onBatchDelete,
  onBatchDownload,
  onColumnToggle,
  onKeywordChange,
  onRefresh,
  onResetFilters,
  onFilterChange,
  onUploadClick,
}) {
  const hasSelection = selectedCount > 0;
  const advancedFilterCount = getActiveAdvancedFilterCount(filters);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <div className="space-y-4 border-b border-sky-100 bg-sky-50/55 px-4 py-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Search aria-hidden="true" className="h-4 w-4 text-primary" />
          Basic search
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_160px_160px_auto] xl:items-end">
          <div className="grid min-w-0 gap-1">
            <Label htmlFor="fileKeyword" className="text-xs text-muted-foreground">
              Keyword
            </Label>
            <div className="relative min-w-0">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="fileKeyword"
                aria-label="Search uploaded files"
                className="pl-9"
                placeholder="Search file name, type or extension"
                title={keyword || "Search file name, type or extension"}
                value={keyword}
                onChange={(event) => onKeywordChange(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">File type</Label>
            <Select
              value={filters.fileType}
              onValueChange={(value) => onFilterChange({ fileType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fileTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">Access</Label>
            <Select
              value={filters.visibility}
              onValueChange={(value) => onFilterChange({ visibility: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 md:col-span-2 xl:col-span-1">
            <Button
              aria-controls="advancedFileFilters"
              aria-expanded={isAdvancedOpen}
              className="w-full justify-center whitespace-nowrap"
              variant="outline"
              type="button"
              onClick={() => setIsAdvancedOpen((current) => !current)}
            >
              <Filter aria-hidden="true" />
              Advanced search
              {advancedFilterCount > 0 ? (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] leading-none text-primary-foreground">
                  {advancedFilterCount}
                </span>
              ) : null}
              <ChevronDown
                aria-hidden="true"
                className={
                  isAdvancedOpen ? "rotate-180 transition-transform" : "transition-transform"
                }
              />
            </Button>

            <Button
              className="w-full justify-center whitespace-nowrap"
              variant="outline"
              type="button"
              onClick={onResetFilters}
            >
              <RotateCcw aria-hidden="true" />
              Reset
            </Button>
          </div>
        </div>

        {isAdvancedOpen ? (
          <div
            id="advancedFileFilters"
            className="grid gap-3 rounded-md border border-sky-200 bg-white/80 p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-4"
          >
            <div className="grid min-w-0 gap-1">
              <Label htmlFor="uploadedFrom" className="text-xs text-muted-foreground">
                Uploaded from
              </Label>
              <DatePickerField
                id="uploadedFrom"
                label="Uploaded from"
                value={filters.uploadedFrom}
                onChange={(value) => onFilterChange({ uploadedFrom: value })}
              />
            </div>

            <div className="grid min-w-0 gap-1">
              <Label htmlFor="uploadedTo" className="text-xs text-muted-foreground">
                Uploaded to
              </Label>
              <DatePickerField
                id="uploadedTo"
                label="Uploaded to"
                value={filters.uploadedTo}
                onChange={(value) => onFilterChange({ uploadedTo: value })}
              />
            </div>

            <div className="grid min-w-0 gap-1">
              <Label htmlFor="minSize" className="text-xs text-muted-foreground">
                Min MB
              </Label>
              <Input
                id="minSize"
                inputMode="decimal"
                value={bytesToMbInput(filters.minSize)}
                onChange={(event) =>
                  onFilterChange({ minSize: fileSizeToBytes(event.target.value, "MB") })
                }
              />
            </div>

            <div className="grid min-w-0 gap-1">
              <Label htmlFor="maxSize" className="text-xs text-muted-foreground">
                Max MB
              </Label>
              <Input
                id="maxSize"
                inputMode="decimal"
                value={bytesToMbInput(filters.maxSize)}
                onChange={(event) =>
                  onFilterChange({ maxSize: fileSizeToBytes(event.target.value, "MB") })
                }
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-sky-100 pt-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid min-w-0 gap-1 xl:max-w-xl xl:flex-1">
          <Label htmlFor="apiBaseUrl" className="text-xs text-muted-foreground">
            API base
          </Label>
          <Input
            id="apiBaseUrl"
            className="truncate"
            title={apiBaseUrl}
            value={apiBaseUrl}
            onChange={(event) => onApiBaseUrlChange(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-end gap-2 sm:flex sm:flex-nowrap">
          <Button
            variant="outline"
            size="icon"
            type="button"
            aria-label="Refresh uploaded files"
            title="Refresh uploaded files"
            disabled={isLoading}
            onClick={onRefresh}
          >
            <RefreshCw aria-hidden="true" className={isLoading ? "animate-spin" : ""} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="w-full sm:w-auto sm:min-w-40"
                variant="outline"
                type="button"
                title="Choose visible table columns"
              >
                <Columns3 aria-hidden="true" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={column.visible}
                  disabled={column.locked}
                  onCheckedChange={() => onColumnToggle(column.key)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="w-full sm:w-auto sm:min-w-40"
            type="button"
            title="Upload files"
            onClick={onUploadClick}
          >
            <Upload aria-hidden="true" />
            Upload
          </Button>
        </div>
      </div>

      {hasSelection ? (
        <div className="flex flex-col gap-2 rounded-md border border-cyan-200 bg-cyan-50/65 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked aria-label="Selected files" />
            {selectedCount} file{selectedCount > 1 ? "s" : ""} selected
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button variant="outline" size="sm" type="button" onClick={onBatchDownload}>
              <Download aria-hidden="true" />
              Download ZIP
            </Button>
            <Button variant="destructive" size="sm" type="button" onClick={onBatchDelete}>
              <Trash2 aria-hidden="true" />
              Delete selected
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { FileToolbar };
