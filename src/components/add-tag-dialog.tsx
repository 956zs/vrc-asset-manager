"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogActionBar } from "@/components/ui/dialog-action-bar";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAssetStore } from "@/stores/asset-store";
import type { Tag } from "@/types";

const PRESET_COLORS = [
  "#f59e0b",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#10b981",
  "#6366f1",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

type TagDialogForm = {
  canSubmit: boolean;
  color: string;
  name: string;
  reset: () => void;
  setColor: (color: string) => void;
  setName: (name: string) => void;
};

type TagDialogController = {
  form: TagDialogForm;
  isEditing: boolean;
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
};

function useTagDialogForm(editingTag: Tag | null, isOpen: boolean): TagDialogForm {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const reset = () => {
    setName("");
    setColor(PRESET_COLORS[0]);
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!editingTag) {
      reset();
      return;
    }
    setName(editingTag.name);
    setColor(editingTag.color);
  }, [editingTag, isOpen]);

  return {
    canSubmit: name.trim().length > 0,
    color,
    name,
    reset,
    setColor,
    setName,
  };
}

function useTagDialogController(): TagDialogController {
  const store = useAssetStore();
  const isEditing = store.editingTag !== null;
  const open = store.isAddTagDialogOpen || isEditing;
  const form = useTagDialogForm(store.editingTag, open);
  const onClose = () => {
    store.setAddTagDialogOpen(false);
    store.setEditingTag(null);
    form.reset();
  };
  const onSubmit = async () => {
    if (!form.canSubmit) return;
    if (store.editingTag) {
      await store.updateTag(store.editingTag.id, form.name.trim(), form.color);
    } else {
      await store.addTag(form.name.trim(), form.color);
    }
    onClose();
  };

  return {
    form,
    isEditing,
    open,
    onClose,
    onOpenChange: (nextOpen) => {
      if (!nextOpen) onClose();
    },
    onSubmit,
  };
}

function TagNameField({ form }: { form: TagDialogForm }) {
  return (
    <FormField
      variant="dialog"
      label={
        <>
          標籤名稱 <span className="text-destructive">*</span>
        </>
      }
    >
      <Input
        value={form.name}
        onChange={(event) => form.setName(event.target.value)}
        placeholder="例：飾品"
      />
    </FormField>
  );
}

function PresetColorButton({
  color,
  selectedColor,
  onSelect,
}: {
  color: string;
  selectedColor: string;
  onSelect: (color: string) => void;
}) {
  const selected = selectedColor === color;

  return (
    <button
      type="button"
      className="h-8 w-8 rounded-full border-2 transition-all"
      title={`選擇顏色 ${color}`}
      aria-label={`選擇顏色 ${color}`}
      style={{
        backgroundColor: color,
        borderColor: selected ? "#fff" : "transparent",
        boxShadow: selected ? `0 0 0 2px ${color}` : "none",
      }}
      onClick={() => onSelect(color)}
    />
  );
}

function PresetColorGrid({ form }: { form: TagDialogForm }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((presetColor) => (
        <PresetColorButton
          key={presetColor}
          color={presetColor}
          selectedColor={form.color}
          onSelect={form.setColor}
        />
      ))}
    </div>
  );
}

function CustomColorInputs({ form }: { form: TagDialogForm }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <Input
        type="color"
        value={form.color}
        onChange={(event) => form.setColor(event.target.value)}
        className="h-8 w-12 border-0 p-0"
      />
      <Input
        value={form.color}
        onChange={(event) => form.setColor(event.target.value)}
        className="flex-1 font-mono text-sm"
        placeholder="#000000"
      />
    </div>
  );
}

function TagColorField({ form }: { form: TagDialogForm }) {
  return (
    <FormField variant="dialog" label="標籤顏色">
      <PresetColorGrid form={form} />
      <CustomColorInputs form={form} />
    </FormField>
  );
}

function TagPreview({ form }: { form: TagDialogForm }) {
  return (
    <FormField variant="dialog" label="預覽">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-md px-2 py-1 text-sm font-medium text-white"
          style={{ backgroundColor: form.color }}
        >
          {form.name || "標籤名稱"}
        </span>
      </div>
    </FormField>
  );
}

function TagDialogFields({ form }: { form: TagDialogForm }) {
  return (
    <div className="space-y-4 py-4">
      <TagNameField form={form} />
      <TagColorField form={form} />
      <TagPreview form={form} />
    </div>
  );
}

function TagDialogFooter({
  form,
  isEditing,
  onClose,
  onSubmit,
}: Pick<TagDialogController, "form" | "isEditing" | "onClose" | "onSubmit">) {
  return (
    <DialogActionBar layout="inset">
      <Button type="button" variant="outline" onClick={onClose}>
        取消
      </Button>
      <Button type="button" onClick={() => void onSubmit()} disabled={!form.canSubmit}>
        {isEditing ? "儲存標籤" : "新增標籤"}
      </Button>
    </DialogActionBar>
  );
}

function AddTagDialogLayout(props: TagDialogController) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{props.isEditing ? "編輯標籤" : "新增標籤"}</DialogTitle>
          <DialogDescription>創建新的標籤來分類你的素材</DialogDescription>
        </DialogHeader>
        <TagDialogFields form={props.form} />
        <TagDialogFooter
          form={props.form}
          isEditing={props.isEditing}
          onClose={props.onClose}
          onSubmit={props.onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

export function AddTagDialog() {
  return <AddTagDialogLayout {...useTagDialogController()} />;
}
