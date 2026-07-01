import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const baseBadgeClassName =
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3";

const badgeVariantClassNames: Record<BadgeVariant, string> = {
  default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
  destructive:
    "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 dark:bg-destructive/60",
  outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
};

function badgeVariants({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: BadgeVariant | null;
} = {}) {
  return cn(
    baseBadgeClassName,
    badgeVariantClassNames[variant ?? "default"],
    className,
  );
}

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & { variant?: BadgeVariant | null }) {
  return (
    <span
      data-slot="badge"
      className={badgeVariants({ variant, className })}
      {...props}
    />
  );
}

export { Badge };
