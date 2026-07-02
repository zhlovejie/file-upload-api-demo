import { useRef, useState } from "react";
import { cn } from "../lib/utils.js";

function DropZone({
  icon,
  title,
  note,
  inputLabel,
  inputKey,
  onFileSelected,
}) {
  const inputRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setIsActive(false);
    onFileSelected(event.dataTransfer.files[0] || null);
  }

  function handleChange(event) {
    onFileSelected(event.target.files[0] || null);
  }

  return (
    <label
      className={cn(
        "relative grid min-h-40 cursor-pointer place-items-center overflow-hidden rounded-md border-2 border-dashed border-sky-300 bg-[linear-gradient(135deg,rgba(239,248,255,0.96),rgba(224,242,254,0.78))] transition-[border-color,background-color,box-shadow] hover:border-cyan-400 hover:bg-accent/70 hover:shadow-[0_12px_28px_rgba(14,116,144,0.12)]",
        isActive && "border-cyan-400 bg-cyan-50 shadow-[0_0_0_4px_rgba(34,211,238,0.16)]",
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsActive(false);
      }}
      onDrop={handleDrop}
    >
      <span className="sr-only">{inputLabel}</span>
      <input
        key={inputKey}
        ref={inputRef}
        type="file"
        aria-label={inputLabel}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={handleChange}
      />
      <span className="pointer-events-none flex flex-col items-center justify-center gap-2 px-5 text-center">
        <span
          className="grid h-12 w-12 place-items-center rounded-md border border-sky-200 bg-white/90 text-lg font-semibold text-primary shadow-[0_10px_22px_rgba(37,99,235,0.12)]"
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="font-semibold text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{note}</span>
      </span>
    </label>
  );
}

export { DropZone };
