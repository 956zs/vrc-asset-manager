"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

type ImportOptionSelectProps<TValue extends string> = {
  label: string;
  help: string;
  value: TValue;
  options: { value: TValue; label: string }[];
  onChange: (value: TValue) => void;
};

type TooltipPosition = {
  left: number;
  top: number;
};

type SelectPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function HelpTooltip({
  children,
  position,
}: {
  children: string;
  position: TooltipPosition | null;
}) {
  if (!position || typeof document === "undefined") return null;

  return createPortal(
    <span
      className="pointer-events-none fixed z-[1000] w-64 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs font-normal leading-relaxed text-popover-foreground shadow-xl"
      style={{ left: position.left, top: position.top }}
    >
      {children}
    </span>,
    document.body,
  );
}

function SelectMenu<TValue extends string>({
  activeIndex,
  id,
  menuRef,
  options,
  position,
  value,
  onHighlight,
  onSelect,
}: {
  activeIndex: number;
  id: string;
  menuRef: React.RefObject<HTMLDivElement | null>;
  options: { value: TValue; label: string }[];
  position: SelectPosition | null;
  value: TValue;
  onHighlight: (index: number) => void;
  onSelect: (value: TValue) => void;
}) {
  if (!position || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      id={id}
      role="listbox"
      className="fixed z-[1000] overflow-y-auto rounded-md border border-border bg-popover p-1 text-sm text-popover-foreground shadow-xl outline-none"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        maxHeight: position.maxHeight,
      }}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isActive = index === activeIndex;

        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={isSelected}
            onMouseEnter={() => onHighlight(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(option.value)}
            className={cn(
              "flex h-8 w-full items-center justify-between gap-2 rounded-sm px-2.5 text-left outline-none transition-colors",
              isActive && "bg-accent text-accent-foreground",
              isSelected && "font-medium text-foreground",
              !isActive && "hover:bg-accent/80 hover:text-accent-foreground",
            )}
          >
            <span className="min-w-0 truncate">{option.label}</span>
            {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

export function ImportOptionSelect<TValue extends string>({
  label,
  help,
  value,
  options,
  onChange,
}: ImportOptionSelectProps<TValue>) {
  const selectId = useId();
  const listboxId = useId();
  const helpButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [selectPosition, setSelectPosition] = useState<SelectPosition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  const updateSelectPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const edgePadding = 12;
    const optionHeight = 32;
    const menuPadding = 8;
    const desiredHeight = Math.min(options.length * optionHeight + menuPadding, 220);
    const belowSpace = window.innerHeight - rect.bottom - edgePadding;
    const aboveSpace = rect.top - edgePadding;
    const opensAbove = belowSpace < desiredHeight && aboveSpace > belowSpace;
    const maxHeight = Math.max(96, Math.min(desiredHeight, opensAbove ? aboveSpace : belowSpace));
    const top = opensAbove ? rect.top - maxHeight - 6 : rect.bottom + 6;
    const width = Math.max(rect.width, 168);

    setSelectPosition({
      left: clamp(rect.left, edgePadding, window.innerWidth - edgePadding - width),
      top,
      width,
      maxHeight,
    });
  }, [options.length]);

  const showTooltip = useCallback(() => {
    const rect = helpButtonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const tooltipWidth = 256;
    const edgePadding = 12;
    const center = rect.left + rect.width / 2;
    setTooltipPosition({
      left: clamp(center, edgePadding + tooltipWidth / 2, window.innerWidth - edgePadding - tooltipWidth / 2),
      top: rect.bottom + 8,
    });
  }, []);

  const openSelect = useCallback(() => {
    setActiveIndex(selectedIndex);
    updateSelectPosition();
    setIsOpen(true);
  }, [selectedIndex, updateSelectPosition]);

  const closeSelect = useCallback(() => {
    setIsOpen(false);
    setSelectPosition(null);
  }, []);

  const selectOption = useCallback(
    (nextValue: TValue) => {
      onChange(nextValue);
      closeSelect();
      triggerRef.current?.focus();
    },
    [closeSelect, onChange],
  );

  useEffect(() => {
    if (!isOpen) return;

    updateSelectPosition();
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeSelect();
    };
    const handleReposition = () => updateSelectPosition();

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [closeSelect, isOpen, updateSelectPosition]);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  return (
    <div className="block space-y-1.5 text-xs font-medium">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <label htmlFor={selectId}>{label}</label>
        <span className="relative inline-flex">
          <button
            ref={helpButtonRef}
            type="button"
            aria-label={`${label}說明`}
            onFocus={showTooltip}
            onMouseEnter={showTooltip}
            onBlur={() => setTooltipPosition(null)}
            onMouseLeave={() => setTooltipPosition(null)}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
          <HelpTooltip position={tooltipPosition}>{help}</HelpTooltip>
        </span>
      </span>
      <span className="relative block">
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-[background-color,border-color,box-shadow]",
            "hover:border-primary/60 hover:bg-accent/25 focus:border-primary focus:ring-2 focus:ring-ring/30",
            isOpen && "border-primary bg-accent/20 ring-2 ring-ring/30",
          )}
          onClick={() => (isOpen ? closeSelect() : openSelect())}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeSelect();
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (isOpen) {
                selectOption(options[activeIndex]?.value ?? value);
              } else {
                openSelect();
              }
              return;
            }

            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!isOpen) {
                openSelect();
                return;
              }

              setActiveIndex((current) => {
                const offset = event.key === "ArrowDown" ? 1 : -1;
                return (current + offset + options.length) % options.length;
              });
            }
          }}
        >
          <span className="min-w-0 truncate">{selectedOption?.label ?? ""}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-180 text-foreground",
            )}
          />
        </button>
        {isOpen && (
          <SelectMenu
            activeIndex={activeIndex}
            id={listboxId}
            menuRef={menuRef}
            options={options}
            position={selectPosition}
            value={value}
            onHighlight={setActiveIndex}
            onSelect={selectOption}
          />
        )}
      </span>
    </div>
  );
}
