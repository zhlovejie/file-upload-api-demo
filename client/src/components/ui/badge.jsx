import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary:
          "border-sky-200 bg-sky-50 text-sky-800",
        outline: "border-sky-200 bg-white/75 text-slate-700",
        success:
          "border-cyan-200 bg-cyan-50 text-cyan-800",
        warning:
          "border-indigo-200 bg-indigo-50 text-indigo-700",
        destructive:
          "border-red-200 bg-red-50 text-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
