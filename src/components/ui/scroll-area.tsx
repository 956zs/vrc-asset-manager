import * as React from "react";

import { cn } from "@/lib/utils";

function ScrollArea({
  className,
  viewportClassName,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  viewportClassName?: string;
}) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("min-h-0 overflow-auto", className)}
      {...props}
    >
      <div
        data-slot="scroll-area-viewport"
        className={cn("min-h-full", viewportClassName)}
      >
        {children}
      </div>
    </div>
  );
}

export { ScrollArea };
