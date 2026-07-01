import { useCallback, useEffect, useState } from "react";
import {
  getLatestReleaseNotesVersion,
  getReleaseNotesForVersion,
  getUnseenReleaseNotes,
  type ReleaseNote,
} from "@/data/release-notes";
import { isTauriRuntime } from "@/lib/tauri-runtime";

const LAST_SEEN_RELEASE_NOTES_VERSION_KEY =
  "vrc-asset-manager:last-seen-release-notes-version";

function readLastSeenVersion() {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(LAST_SEEN_RELEASE_NOTES_VERSION_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

function writeLastSeenVersion(version: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LAST_SEEN_RELEASE_NOTES_VERSION_KEY, version);
  } catch {
    // Ignore storage failures; release notes must never block startup.
  }
}

async function resolveAppVersion() {
  if (!isTauriRuntime()) {
    return getLatestReleaseNotesVersion();
  }

  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return (await getVersion()) || getLatestReleaseNotesVersion();
  } catch {
    return getLatestReleaseNotesVersion();
  }
}

type ReleaseNotesController = {
  currentVersion: string;
  lastSeenVersion: string | null;
  notes: ReleaseNote[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
  onOpenCurrentReleaseNotes: () => void;
};

export function useReleaseNotesController(): ReleaseNotesController {
  const [currentVersion, setCurrentVersion] = useState(getLatestReleaseNotesVersion());
  const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(() =>
    readLastSeenVersion(),
  );
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void resolveAppVersion().then((resolvedVersion) => {
      if (cancelled) return;

      const seenVersion = readLastSeenVersion();
      const unseenNotes = getUnseenReleaseNotes(resolvedVersion, seenVersion);
      setCurrentVersion(resolvedVersion);
      setLastSeenVersion(seenVersion);
      setNotes(unseenNotes);
      setOpen(unseenNotes.length > 0);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const onAcknowledge = useCallback(() => {
    writeLastSeenVersion(currentVersion);
    setLastSeenVersion(currentVersion);
    setOpen(false);
  }, [currentVersion]);

  const onOpenCurrentReleaseNotes = useCallback(() => {
    const currentNote = getReleaseNotesForVersion(currentVersion);
    if (!currentNote) return;

    setNotes([currentNote]);
    setOpen(true);
  }, [currentVersion]);

  return {
    currentVersion,
    lastSeenVersion,
    notes,
    open,
    onOpenChange: setOpen,
    onAcknowledge,
    onOpenCurrentReleaseNotes,
  };
}
