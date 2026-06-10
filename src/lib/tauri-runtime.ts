type TauriWindow = Window & {
  __TAURI_INTERNALS__?: {
    invoke?: unknown;
  };
};

export function isTauriRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  return typeof (window as TauriWindow).__TAURI_INTERNALS__?.invoke === "function";
}

export async function invokeTauri<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error("此功能需要在桌面版或 Tauri demo 中使用。");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}
