"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleHelp } from "lucide-react";

import { FloatingSurface } from "@/components/ui/floating-surface";
import { cn } from "@/lib/utils";

type HelpHintPosition = {
  left: number;
  top: number;
};

type HelpHintProps = {
  children: string;
  className?: string;
  label: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function HelpHintTooltip({
  children,
  position,
}: {
  children: ReactNode;
  position: HelpHintPosition | null;
}) {
  if (!position || typeof document === "undefined") return null;

  return createPortal(
    <FloatingSurface
      padding="tooltip"
      className="pointer-events-none fixed z-[1000] w-64 -translate-x-1/2 text-xs font-normal leading-relaxed"
      style={{ left: position.left, top: position.top }}
    >
      {children}
    </FloatingSurface>,
    document.body,
  );
}

function HelpHint({ children, className, label }: HelpHintProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState<HelpHintPosition | null>(null);

  const showTooltip = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const tooltipWidth = 256;
    const edgePadding = 12;
    const center = rect.left + rect.width / 2;

    setPosition({
      left: clamp(
        center,
        edgePadding + tooltipWidth / 2,
        window.innerWidth - edgePadding - tooltipWidth / 2,
      ),
      top: rect.bottom + 8,
    });
  }, []);

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${label}說明`}
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
          className,
        )}
        onBlur={() => setPosition(null)}
        onFocus={showTooltip}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setPosition(null)}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      <HelpHintTooltip position={position}>{children}</HelpHintTooltip>
    </span>
  );
}

export { HelpHint };
