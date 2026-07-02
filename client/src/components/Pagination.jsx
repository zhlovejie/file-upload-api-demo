import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.jsx";

const pageSizeOptions = [10, 20, 30, 40, 50];

function Pagination({ pagination, pageSize, onPageChange, onPageSizeChange }) {
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pageSize + 1;
  const end = Math.min(pagination.page * pageSize, pagination.total);

  return (
    <div className="flex flex-col gap-3 border-t bg-muted/25 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <div>
        Showing <span className="font-medium text-foreground">{start}-{end}</span> of{" "}
        <span className="font-medium text-foreground">{pagination.total}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span>Rows</span>
        <Select value={String(pageSize)} onValueChange={onPageSizeChange}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label="Previous page"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </Button>
        <span className="min-w-20 text-center font-medium tabular-nums text-foreground">
          {pagination.page} / {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label="Next page"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          <ChevronRight aria-hidden="true" size={18} />
        </Button>
      </div>
    </div>
  );
}

export { Pagination };
