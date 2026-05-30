import {
  menuPadding,
  menuWidth,
  rowHeight,
  type EditableElement,
} from "./types";

const textInputTypes = new Set([
  "",
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

export const isTextEditable = (target: EventTarget | null): EditableElement | null => {
  if (!(target instanceof Element)) {
    return null;
  }

  const element = target.closest("input, textarea");
  if (element instanceof HTMLTextAreaElement) {
    return element;
  }
  if (element instanceof HTMLInputElement && textInputTypes.has(element.type)) {
    return element;
  }

  return null;
};

export const canEdit = (element: EditableElement | null) =>
  Boolean(element && !element.disabled && !element.readOnly);

export const getEditableSelection = (element: EditableElement | null) => {
  if (!element) {
    return "";
  }

  const start = element.selectionStart ?? 0;
  const end = element.selectionEnd ?? 0;
  return start === end ? "" : element.value.slice(start, end);
};

export const replaceEditableSelection = (element: EditableElement, text: string) => {
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? element.value.length;

  element.focus();
  element.setRangeText(text, start, end, "end");
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

export const getSelectedText = () => window.getSelection()?.toString() ?? "";

const normalizeUrl = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? "";
  return /^https?:\/\/\S+$/i.test(trimmed) ? trimmed : null;
};

export const getContextUrl = (target: EventTarget | null, selectedText: string) => {
  if (target instanceof Element) {
    const explicit = target.closest<HTMLElement>("[data-context-url]");
    const explicitUrl = normalizeUrl(explicit?.dataset.contextUrl);
    if (explicitUrl) {
      return explicitUrl;
    }

    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    const anchorUrl = normalizeUrl(anchor?.href);
    if (anchorUrl) {
      return anchorUrl;
    }

    const targetText = normalizeUrl(target.textContent);
    if (targetText) {
      return targetText;
    }
  }

  return normalizeUrl(selectedText);
};

const normalizeFilePath = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? "";
  if (/^[a-zA-Z]:[\\/].+/.test(trimmed) || /^\\\\[^\\]+\\.+/.test(trimmed)) {
    return trimmed;
  }
  return null;
};

export const getContextFilePath = (
  target: EventTarget | null,
  selectedText: string,
) => {
  if (target instanceof Element) {
    const explicit = target.closest<HTMLElement>("[data-context-path]");
    const explicitPath = normalizeFilePath(explicit?.dataset.contextPath);
    if (explicitPath) {
      return explicitPath;
    }

    const targetPath = normalizeFilePath(target.textContent);
    if (targetPath) {
      return targetPath;
    }
  }

  return normalizeFilePath(selectedText);
};

export const getContextAsset = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return null;
  }

  const element = target.closest<HTMLElement>("[data-context-asset-id]");
  const id = Number(element?.dataset.contextAssetId);
  if (!Number.isFinite(id)) {
    return null;
  }

  return {
    id,
    name: element?.dataset.contextAssetName ?? null,
  };
};

export const clampMenuPosition = (
  x: number,
  y: number,
  itemCount: number,
  separatorCount: number,
) => {
  const estimatedHeight = menuPadding * 2 + itemCount * rowHeight + separatorCount * 9;
  const maxX = Math.max(8, window.innerWidth - menuWidth - 8);
  const maxY = Math.max(8, window.innerHeight - estimatedHeight - 8);

  return {
    x: Math.min(Math.max(8, x), maxX),
    y: Math.min(Math.max(8, y), maxY),
  };
};
