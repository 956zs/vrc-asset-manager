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

export function AddModelDialog() {
  const {
    isAddModelDialogOpen,
    editingModel,
    setAddModelDialogOpen,
    setEditingModel,
    addModel,
    updateModel,
  } = useAssetStore();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const isEditing = editingModel !== null;
  const isOpen = isAddModelDialogOpen || isEditing;

  const resetForm = () => {
    setName("");
    setDisplayName("");
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (editingModel) {
      setName(editingModel.name);
      setDisplayName(editingModel.display_name || "");
      return;
    }

    resetForm();
  }, [editingModel, isOpen]);

  const handleClose = () => {
    setAddModelDialogOpen(false);
    setEditingModel(null);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }

    if (editingModel) {
      await updateModel(editingModel.id, name.trim(), displayName.trim() || undefined);
    } else {
      await addModel(name.trim(), displayName.trim() || undefined);
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
          <DialogTitle>{isEditing ? "編輯模型" : "新增模型"}</DialogTitle>
          <DialogDescription>添加新的 VRChat 模型到篩選清單</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              模型名稱 <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例：桔子"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">顯示名稱</label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="例：桔子 (Kitsune)"
            />
            <p className="text-xs text-muted-foreground">
              可選，用於在介面中顯示更易讀的名稱
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!name.trim()}>
            {isEditing ? "儲存模型" : "新增模型"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
