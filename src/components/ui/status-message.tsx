import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusTone = "default" | "danger" | "info" | "success" | "warning";

type StatusMessageProps = {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
  title?: ReactNode;
  tone?: StatusTone;
};

const toneClassNames: Record<StatusTone, string> = {
  default: "border-border bg-background/70 text-foreground",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-border bg-background/70 text-foreground",
  success: "border-primary/30 bg-primary/10 text-foreground",
  warning: "border-amber-500/45 bg-amber-500/8 text-amber-100",
};

const iconClassNames: Record<StatusTone, string> = {
  default: "text-muted-foreground",
  danger: "text-destructive",
  info: "text-muted-foreground",
  success: "text-primary",
  warning: "text-amber-300",
};

function StatusMessage({
  action,
  children,
  className,
  icon,
  title,
  tone = "default",
}: StatusMessageProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 text-sm",
        toneClassNames[tone],
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <span className={cn("mt-0.5 shrink-0", iconClassNames[tone])}>
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {title && <p className="font-medium">{title}</p>}
          {children && (
            <div
              className={cn(
                title && "mt-1",
                tone === "default" || tone === "info"
                  ? "text-muted-foreground"
                  : undefined,
              )}
            >
              {children}
            </div>
          )}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export { StatusMessage, type StatusTone };
