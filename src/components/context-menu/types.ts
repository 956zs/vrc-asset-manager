import type { ComponentType } from "react";

export type EditableElement = HTMLInputElement | HTMLTextAreaElement;

export type ContextMenuItem =
  | {
      type: "item";
      id: string;
      label: string;
      shortcut?: string;
      disabled?: boolean;
      icon: ComponentType<{ className?: string }>;
      onSelect: () => void | Promise<void>;
    }
  | { type: "separator"; id: string };

export type MenuState = {
  x: number;
  y: number;
  editable: EditableElement | null;
  editableSelection: string;
  selectedText: string;
  linkUrl: string | null;
  filePath: string | null;
  asset: {
    id: number;
    name: string | null;
  } | null;
};

export const menuWidth = 224;
export const rowHeight = 34;
export const menuPadding = 8;
