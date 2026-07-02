import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover.jsx";
import { cn } from "../lib/utils.js";

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

const fullDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate &&
    secondDate &&
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function DatePickerField({ id, label, value, onChange }) {
  const selectedDate = parseDateValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const baseDate = selectedDate || new Date();
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  });

  const days = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const today = new Date();
  const selectedLabel = selectedDate ? fullDateFormatter.format(selectedDate) : "Select date";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const baseDate = selectedDate || new Date();
    setVisibleMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
  }, [isOpen, value]);

  function moveMonth(offset) {
    setVisibleMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1),
    );
  }

  function selectDate(date) {
    onChange(formatDateValue(date));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setIsOpen(false);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-white/86 px-3 py-1 text-left text-sm text-foreground shadow-sm transition-[border-color,box-shadow,background-color] hover:border-sky-300 hover:bg-white focus-visible:border-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={label}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate", !selectedDate && "text-muted-foreground")}>
              {selectedLabel}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(calc(100vw-2rem),20rem)] p-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Previous month"
            onClick={() => moveMonth(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <div className="text-sm font-semibold text-foreground">
            {monthFormatter.format(visibleMonth)}
          </div>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Next month"
            onClick={() => moveMonth(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
          {weekdayLabels.map((weekday) => (
            <div key={weekday} className="py-1">
              {weekday}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((date) => {
            const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);

            return (
              <button
                key={formatDateValue(date)}
                type="button"
                className={cn(
                  "grid h-9 place-items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-blue-600"
                    : "text-foreground hover:bg-sky-50",
                  isOutsideMonth && !isSelected && "text-muted-foreground/55",
                  isToday && !isSelected && "ring-1 ring-sky-300",
                )}
                onClick={() => selectDate(date)}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-sky-100 pt-3">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled={!selectedDate}
            onClick={() => onChange("")}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              const nextDate = new Date();
              selectDate(nextDate);
            }}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePickerField };
