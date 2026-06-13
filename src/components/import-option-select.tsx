"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { DisclosureChevron } from "@/components/ui/disclosure";
import { FloatingMenuItem } from "@/components/ui/floating-menu";
import { FloatingSurface } from "@/components/ui/floating-surface";
import { HelpHint } from "@/components/ui/help-hint";
import { cn } from "@/lib/utils";

type ImportOptionSelectProps<TValue extends string> = {
  label: string;
  help: string;
  value: TValue;
  options: { value: TValue; label: string }[];
  onChange: (value: TValue) => void;
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
    <FloatingSurface
      ref={menuRef}
      id={id}
      role="listbox"
      padding="menu"
      className="fixed z-[1000] overflow-y-auto text-sm"
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
          <FloatingMenuItem
            key={option.value}
            role="option"
            aria-selected={isSelected}
            active={isActive}
            selected={isSelected}
            className="px-2.5"
            trailing={
              isSelected ? (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              ) : null
            }
            onMouseEnter={() => onHighlight(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </FloatingMenuItem>
        );
      })}
    </FloatingSurface>,
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
        <HelpHint label={label}>{help}</HelpHint>
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
          <DisclosureChevron
            expanded={isOpen}
            collapsedClassName=""
            expandedClassName="rotate-180 text-foreground"
            className="shrink-0 text-muted-foreground"
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
