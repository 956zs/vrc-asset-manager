import * as React from "react";

import { cn } from "@/lib/utils";

type FloatingMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  contentClassName?: string;
  leading?: React.ReactNode;
  selected?: boolean;
  trailing?: React.ReactNode;
};

const FloatingMenuItem = React.forwardRef<HTMLButtonElement, FloatingMenuItemProps>(
  (
    {
      active = false,
      children,
      className,
      contentClassName,
      leading,
      selected = false,
      trailing,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm outline-none transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
        selected && "font-medium text-foreground",
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
      {...props}
    >
      {leading}
      <span className={cn("min-w-0 flex-1 truncate", contentClassName)}>
        {children}
      </span>
      {trailing}
    </button>
  ),
);

FloatingMenuItem.displayName = "FloatingMenuItem";

function FloatingMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function FloatingMenuEmpty({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-2 py-1.5 text-sm text-muted-foreground", className)} {...props}>
      {children}
    </div>
  );
}

export { FloatingMenuEmpty, FloatingMenuItem, FloatingMenuSeparator };
