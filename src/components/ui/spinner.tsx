import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type SpinnerProps = ComponentProps<typeof Loader2>;

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loader2
      aria-hidden="true"
      className={cn("h-4 w-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
