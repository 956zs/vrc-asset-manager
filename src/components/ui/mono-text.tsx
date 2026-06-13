import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type MonoTextTone = "default" | "muted";
type MonoTextWrap = "break" | "truncate";
type MonoTextProps = ComponentProps<"p"> & {
  as?: "p" | "span";
  tone?: MonoTextTone;
  wrap?: MonoTextWrap;
};

const toneClasses: Record<MonoTextTone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
};

const wrapClasses: Record<MonoTextWrap, string> = {
  break: "break-all",
  truncate: "truncate",
};

function MonoText({
  as: Component = "p",
  children,
  className,
  tone = "muted",
  wrap = "truncate",
  ...props
}: MonoTextProps) {
  return (
    <Component
      className={cn(
        "font-mono text-xs",
        toneClasses[tone],
        wrapClasses[wrap],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export { MonoText };
