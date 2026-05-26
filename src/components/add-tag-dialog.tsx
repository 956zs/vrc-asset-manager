"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAssetStore } from "@/stores/asset-store";

const presetColors = [
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

export function AddTagDialog() {
  const {
    isAddTagDialogOpen,
    editingTag,
    setAddTagDialogOpen,
    setEditingTag,
    addTag,
    updateTag,
  } = useAssetStore();
  const [name, setName] = useState("");
  const [color, setColor] = useState(presetColors[0]);
  const isEditing = editingTag !== null;
  const isOpen = isAddTagDialogOpen || isEditing;

  const resetForm = () => {
    setName("");
    setColor(presetColors[0]);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (editingTag) {
      setName(editingTag.name);
      setColor(editingTag.color);
      return;
    }

    resetForm();
  }, [editingTag, isOpen]);

  const handleClose = () => {
    setAddTagDialogOpen(false);
    setEditingTag(null);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }

    if (editingTag) {
      await updateTag(editingTag.id, name.trim(), color);
    } else {
      await addTag(name.trim(), color);
    }
    handleClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "編輯標籤" : "新增標籤"}</DialogTitle>
          <DialogDescription>創建新的標籤來分類你的素材</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              標籤名稱 <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例：飾品"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">標籤顏色</label>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className="h-8 w-8 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: presetColor,
                    borderColor: color === presetColor ? "#fff" : "transparent",
                    boxShadow:
                      color === presetColor ? `0 0 0 2px ${presetColor}` : "none",
                  }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-8 w-12 border-0 p-0"
              />
              <Input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="flex-1 font-mono text-sm"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">預覽</label>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-md px-2 py-1 text-sm font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {name || "標籤名稱"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!name.trim()}>
            {isEditing ? "儲存標籤" : "新增標籤"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
