import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DetailFieldLabelProps = {
  as?: "label" | "p";
  children: ReactNode;
  className?: string;
};

function DetailFieldLabel({
  as: Component = "label",
  children,
  className,
}: DetailFieldLabelProps) {
  return (
    <Component className={cn("text-sm font-medium text-muted-foreground", className)}>
      {children}
    </Component>
  );
}

export { DetailFieldLabel };
