import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ListRowProps = {
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  descriptionWrap?: "break" | "truncate";
  leading?: ReactNode;
  onClick?: () => void;
  surface?: "plain" | "card";
  title: ReactNode;
  titleClassName?: string;
  titleWrap?: "break" | "truncate";
  trailing?: ReactNode;
};

const wrapClasses = {
  break: "whitespace-normal break-all",
  truncate: "truncate",
};

function ListRow({
  children,
  className,
  description,
  descriptionClassName,
  descriptionWrap = "truncate",
  leading,
  onClick,
  surface = "plain",
  title,
  titleClassName,
  titleWrap = "truncate",
  trailing,
}: ListRowProps) {
  const classNames = cn(
    "grid w-full items-center gap-3 rounded-md text-left",
    leading
      ? "grid-cols-[auto_minmax(0,1fr)_auto]"
      : "grid-cols-[minmax(0,1fr)_auto]",
    surface === "card" && "border border-border bg-card",
    onClick && "transition-colors hover:border-primary/60 hover:bg-accent/50",
    className,
  );

  const content = (
    <>
      {leading}
      <div className="min-w-0">
        <div
          className={cn(
            "min-w-0 text-sm font-medium text-foreground",
            wrapClasses[titleWrap],
            titleClassName,
          )}
        >
          {title}
        </div>
        {description && (
          <div
            className={cn(
              "mt-1 text-xs text-muted-foreground",
              wrapClasses[descriptionWrap],
              descriptionClassName,
            )}
          >
            {description}
          </div>
        )}
        {children}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={classNames} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className={classNames}>
      {content}
    </div>
  );
}

export { ListRow };
