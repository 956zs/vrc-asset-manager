import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type SidebarOptionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

type SidebarCountBadgeProps = {
  children: ReactNode;
  className?: string;
};

type SidebarTextProps = ComponentProps<"p">;

function SidebarOptionButton({
  active = false,
  children,
  className,
  type = "button",
  ...props
}: SidebarOptionButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "flex h-8 w-full items-center rounded-md px-3 text-left text-sm transition-colors hover:bg-sidebar-accent",
        active && "bg-sidebar-accent font-medium text-sidebar-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function SidebarCountBadge({ children, className }: SidebarCountBadgeProps) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-sidebar-accent px-2 py-0.5 text-[11px] font-normal text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SidebarHelpText({ className, ...props }: SidebarTextProps) {
  return (
    <p
      className={cn(
        "px-1 text-[11px] leading-relaxed text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SidebarOptionDescription({ className, ...props }: SidebarTextProps) {
  return (
    <p
      className={cn("truncate text-[11px] text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  SidebarCountBadge,
  SidebarHelpText,
  SidebarOptionButton,
  SidebarOptionDescription,
};
