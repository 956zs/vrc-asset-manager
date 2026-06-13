export type ReleaseNoteSectionKey =
  | "features"
  | "improvements"
  | "fixes"
  | "breakingChanges";

export type ReleaseNoteInlineNode =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "highlight"; text: string }
  | { type: "code"; text: string };

export type ReleaseNoteItem = {
  key: string;
  text: string;
  nodes: ReleaseNoteInlineNode[];
};

export type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  summary: string;
  summaryNodes: ReleaseNoteInlineNode[];
  features: ReleaseNoteItem[];
  improvements: ReleaseNoteItem[];
  fixes: ReleaseNoteItem[];
  breakingChanges: ReleaseNoteItem[];
};

type ReleaseNoteFrontmatter = {
  version?: string;
  date?: string;
  title?: string;
  summary?: string;
};

type ParsedVersion = {
  core: number[];
  prerelease: string[];
};

const releaseNoteMarkdownSources = Object.values(
  import.meta.glob<string>("../release-notes/*.md", {
    eager: true,
    import: "default",
    query: "?raw",
  }),
);

const sectionHeadingMap: Record<string, ReleaseNoteSectionKey> = {
  added: "features",
  feature: "features",
  features: "features",
  "new features": "features",
  "新功能": "features",
  changed: "improvements",
  change: "improvements",
  improved: "improvements",
  improvements: "improvements",
  "改善": "improvements",
  fixed: "fixes",
  fix: "fixes",
  fixes: "fixes",
  "修正": "fixes",
  breaking: "breakingChanges",
  "breaking changes": "breakingChanges",
  caution: "breakingChanges",
  notes: "breakingChanges",
  "需要注意": "breakingChanges",
  "破壞性變更": "breakingChanges",
};

const prereleaseRank: Record<string, number> = {
  dev: 0,
  alpha: 1,
  beta: 2,
  preview: 2,
  rc: 3,
};

function parseVersion(version: string): ParsedVersion {
  const [coreText, prereleaseText = ""] = version.replace(/^v/i, "").split("-");
  return {
    core: coreText.split(".").map((part) => Number.parseInt(part, 10) || 0),
    prerelease: prereleaseText ? prereleaseText.split(".") : [],
  };
}

function comparePrereleasePart(first: string, second: string) {
  const firstNumber = Number.parseInt(first, 10);
  const secondNumber = Number.parseInt(second, 10);
  const firstIsNumber = String(firstNumber) === first;
  const secondIsNumber = String(secondNumber) === second;

  if (firstIsNumber && secondIsNumber) return firstNumber - secondNumber;
  if (firstIsNumber) return -1;
  if (secondIsNumber) return 1;

  const firstRank = prereleaseRank[first.toLowerCase()];
  const secondRank = prereleaseRank[second.toLowerCase()];
  if (firstRank !== undefined || secondRank !== undefined) {
    return (firstRank ?? 10) - (secondRank ?? 10);
  }

  return first.localeCompare(second);
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontmatter: {}, body: markdown };
  }

  const frontmatter = match[1].split(/\r?\n/).reduce<ReleaseNoteFrontmatter>(
    (metadata, line) => {
      const keyMatch = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
      if (!keyMatch) return metadata;

      return {
        ...metadata,
        [keyMatch[1]]: keyMatch[2].replace(/^["']|["']$/g, "").trim(),
      };
    },
    {},
  );

  return {
    frontmatter,
    body: markdown.slice(match[0].length),
  };
}

function parseInlineMarkdown(text: string): ReleaseNoteInlineNode[] {
  const nodes: ReleaseNoteInlineNode[] = [];
  const pattern = /(`([^`]+)`|\*\*([^*]+)\*\*|==([^=]+)==)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push({ type: "text", text: text.slice(cursor, match.index) });
    }

    if (match[2]) {
      nodes.push({ type: "code", text: match[2] });
    } else if (match[3]) {
      nodes.push({ type: "strong", text: match[3] });
    } else if (match[4]) {
      nodes.push({ type: "highlight", text: match[4] });
    }

    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) {
    nodes.push({ type: "text", text: text.slice(cursor) });
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text }];
}

function stripInlineMarkers(text: string) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/==([^=]+)==/g, "$1");
}

function toReleaseNoteItem(section: ReleaseNoteSectionKey, index: number, text: string) {
  const plainText = stripInlineMarkers(text.trim());
  return {
    key: `${section}-${index}-${plainText}`,
    text: plainText,
    nodes: parseInlineMarkdown(text.trim()),
  };
}

function parseReleaseNoteMarkdown(markdown: string): ReleaseNote {
  const { frontmatter, body } = parseFrontmatter(markdown);
  const sections: Record<ReleaseNoteSectionKey, string[]> = {
    features: [],
    improvements: [],
    fixes: [],
    breakingChanges: [],
  };
  let activeSection: ReleaseNoteSectionKey | null = null;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      activeSection = sectionHeadingMap[heading[1].trim().toLowerCase()] ?? null;
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet && activeSection) {
      sections[activeSection].push(bullet[1]);
      continue;
    }

    if (activeSection && sections[activeSection].length > 0) {
      const lastIndex = sections[activeSection].length - 1;
      sections[activeSection][lastIndex] =
        `${sections[activeSection][lastIndex]} ${line}`;
    }
  }

  const version = frontmatter.version ?? "0.0.0";
  const summary = frontmatter.summary ?? "";

  return {
    version,
    date: frontmatter.date ?? "",
    title: frontmatter.title ?? version,
    summary: stripInlineMarkers(summary),
    summaryNodes: parseInlineMarkdown(summary),
    features: sections.features.map((item, index) =>
      toReleaseNoteItem("features", index, item),
    ),
    improvements: sections.improvements.map((item, index) =>
      toReleaseNoteItem("improvements", index, item),
    ),
    fixes: sections.fixes.map((item, index) => toReleaseNoteItem("fixes", index, item)),
    breakingChanges: sections.breakingChanges.map((item, index) =>
      toReleaseNoteItem("breakingChanges", index, item),
    ),
  };
}

export const releaseNotes: ReleaseNote[] = releaseNoteMarkdownSources.map(
  parseReleaseNoteMarkdown,
);

export function compareVersions(firstVersion: string, secondVersion: string) {
  const first = parseVersion(firstVersion);
  const second = parseVersion(secondVersion);
  const coreLength = Math.max(first.core.length, second.core.length);

  for (let index = 0; index < coreLength; index += 1) {
    const diff = (first.core[index] ?? 0) - (second.core[index] ?? 0);
    if (diff !== 0) return diff;
  }

  if (first.prerelease.length === 0 && second.prerelease.length === 0) return 0;
  if (first.prerelease.length === 0) return 1;
  if (second.prerelease.length === 0) return -1;

  const prereleaseLength = Math.max(first.prerelease.length, second.prerelease.length);
  for (let index = 0; index < prereleaseLength; index += 1) {
    const firstPart = first.prerelease[index];
    const secondPart = second.prerelease[index];
    if (firstPart === undefined) return -1;
    if (secondPart === undefined) return 1;

    const diff = comparePrereleasePart(firstPart, secondPart);
    if (diff !== 0) return diff;
  }

  return 0;
}

export function getLatestReleaseNotesVersion() {
  return [...releaseNotes].sort((first, second) =>
    compareVersions(second.version, first.version),
  )[0]?.version ?? "0.0.0";
}

export function getReleaseNotesForVersion(version: string) {
  return releaseNotes.find((note) => compareVersions(note.version, version) === 0) ?? null;
}

export function getUnseenReleaseNotes(
  currentVersion: string,
  lastSeenVersion: string | null,
) {
  if (!lastSeenVersion) {
    const currentNote = getReleaseNotesForVersion(currentVersion);
    return currentNote ? [currentNote] : [];
  }

  if (compareVersions(currentVersion, lastSeenVersion) <= 0) {
    return [];
  }

  return releaseNotes
    .filter(
      (note) =>
        compareVersions(note.version, lastSeenVersion) > 0 &&
        compareVersions(note.version, currentVersion) <= 0,
    )
    .sort((first, second) => compareVersions(first.version, second.version));
}
