import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number | null;
  max?: number;
  indeterminate?: boolean;
};

function Progress({
  className,
  value = 0,
  max = 100,
  indeterminate = false,
  ...props
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const percentage = Math.min(
    100,
    Math.max(0, ((value ?? 0) / safeMax) * 100),
  );

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={indeterminate ? undefined : Math.round(percentage)}
      aria-busy={indeterminate || undefined}
      className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-300 ease-out",
          indeterminate && "progress-indeterminate w-2/5",
        )}
        style={indeterminate ? undefined : { width: `${percentage}%` }}
      />
    </div>
  );
}

export { Progress };
