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
import type { Model } from "@/types";

type ModelDialogForm = {
  canSubmit: boolean;
  displayName: string;
  name: string;
  reset: () => void;
  setDisplayName: (displayName: string) => void;
  setName: (name: string) => void;
};

type ModelDialogController = {
  form: ModelDialogForm;
  isEditing: boolean;
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
};

function useModelDialogForm(
  editingModel: Model | null,
  isOpen: boolean,
): ModelDialogForm {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const reset = () => {
    setName("");
    setDisplayName("");
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!editingModel) {
      reset();
      return;
    }
    setName(editingModel.name);
    setDisplayName(editingModel.display_name || "");
  }, [editingModel, isOpen]);

  return {
    canSubmit: name.trim().length > 0,
    displayName,
    name,
    reset,
    setDisplayName,
    setName,
  };
}

function useModelDialogController(): ModelDialogController {
  const store = useAssetStore();
  const isEditing = store.editingModel !== null;
  const open = store.isAddModelDialogOpen || isEditing;
  const form = useModelDialogForm(store.editingModel, open);
  const onClose = () => {
    store.setAddModelDialogOpen(false);
    store.setEditingModel(null);
    form.reset();
  };
  const onSubmit = async () => {
    if (!form.canSubmit) return;
    if (store.editingModel) {
      await store.updateModel(
        store.editingModel.id,
        form.name.trim(),
        form.displayName.trim() || undefined,
      );
    } else {
      await store.addModel(form.name.trim(), form.displayName.trim() || undefined);
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

function ModelDialogFields({ form }: { form: ModelDialogForm }) {
  return (
    <div className="space-y-4 py-4">
      <FormField
        variant="dialog"
        label={
          <>
            模型名稱 <span className="text-destructive">*</span>
          </>
        }
      >
        <Input
          value={form.name}
          onChange={(event) => form.setName(event.target.value)}
          placeholder="例：桔子"
        />
      </FormField>
      <FormField variant="dialog" label="顯示名稱">
        <Input
          value={form.displayName}
          onChange={(event) => form.setDisplayName(event.target.value)}
          placeholder="例：桔子 (Kitsune)"
        />
        <p className="text-xs text-muted-foreground">
          可選，用於在介面中顯示更易讀的名稱
        </p>
      </FormField>
    </div>
  );
}

function ModelDialogFooter({
  form,
  isEditing,
  onClose,
  onSubmit,
}: Pick<ModelDialogController, "form" | "isEditing" | "onClose" | "onSubmit">) {
  return (
    <DialogActionBar layout="inset">
      <Button type="button" variant="outline" onClick={onClose}>
        取消
      </Button>
      <Button type="button" onClick={() => void onSubmit()} disabled={!form.canSubmit}>
        {isEditing ? "儲存模型" : "新增模型"}
      </Button>
    </DialogActionBar>
  );
}

function AddModelDialogLayout(props: ModelDialogController) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{props.isEditing ? "編輯模型" : "新增模型"}</DialogTitle>
          <DialogDescription>添加新的 VRChat 模型到篩選清單</DialogDescription>
        </DialogHeader>
        <ModelDialogFields form={props.form} />
        <ModelDialogFooter
          form={props.form}
          isEditing={props.isEditing}
          onClose={props.onClose}
          onSubmit={props.onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

export function AddModelDialog() {
  return <AddModelDialogLayout {...useModelDialogController()} />;
}
