import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DetailFieldValueWrap = "break" | "pre-wrap";
type DetailFieldValueProps = {
  children: ReactNode;
  className?: string;
  wrap?: DetailFieldValueWrap;
};

const wrapClasses: Record<DetailFieldValueWrap, string> = {
  break: "break-all",
  "pre-wrap": "whitespace-pre-wrap break-words",
};

function DetailFieldValue({
  children,
  className,
  wrap = "break",
}: DetailFieldValueProps) {
  return (
    <p className={cn("mt-1 text-sm text-foreground", wrapClasses[wrap], className)}>
      {children}
    </p>
  );
}

export { DetailFieldValue };
