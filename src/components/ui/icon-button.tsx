import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "children"> & {
  badge?: ReactNode;
  badgeClassName?: string;
  icon: ReactNode;
  iconClassName?: string;
  label: string;
};

function IconButton({
  badge,
  badgeClassName,
  className,
  icon,
  iconClassName,
  label,
  size = "icon",
  type = "button",
  variant = "ghost",
  ...props
}: IconButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      title={label}
      aria-label={label}
      className={cn(badge && "relative", className)}
      {...props}
    >
      <span className={cn("inline-flex items-center justify-center", iconClassName)}>
        {icon}
      </span>
      {badge && (
        <span
          className={cn(
            "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none text-primary-foreground",
            badgeClassName,
          )}
        >
          {badge}
        </span>
      )}
    </Button>
  );
}

export { IconButton };
