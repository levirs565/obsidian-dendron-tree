import { CachedMetadata, HeadingCache, TFile, parseLinktext } from "obsidian";
import DendronTreePlugin from "./main";
import { parsePath } from "./path";
import { Note } from "./note";
import { DendronVault } from "./dendron-vault";

export type RefAnchor =
  | {
      type: "begin";
    }
  | {
      type: "end";
    }
  | {
      type: "wildcard";
    }
  | {
      type: "block";
      name: string;
    }
  | {
      type: "header";
      name: string;
      lineOffset: number;
    };

export interface RefRange {
  start: number;
  startLineOffset: number;
  /* undefined = end of file */
  end: number | undefined;
}

export function parseRefAnchor(pos: string): RefAnchor {
  if (pos === "*") {
    return {
      type: "wildcard",
    };
  } else if (pos === "^begin") {
    return {
      type: "begin",
    };
  } else if (pos === "^end") {
    return {
      type: "end",
    };
  } else if (pos.startsWith("^")) {
    return {
      type: "block",
      name: pos.slice(1),
    };
  } else {
    const [name, lineOffsetStr] = pos.split(",", 2);
    return {
      type: "header",
      name,
      lineOffset: parseInt(lineOffsetStr ?? "0"),
    };
  }
}

export function getRefContentRange(
  startAnchor: RefAnchor,
  endAnchor: RefAnchor | undefined,
  metadata: CachedMetadata
): RefRange | null {
  const range: RefRange = {
    start: 0,
    startLineOffset: 0,
    end: undefined,
  };

  if (startAnchor.type === "begin") {
    range.start = 0;
    range.end = metadata.headings?.[0].position.start.offset;
  } else if (startAnchor.type === "end" || startAnchor.type === "wildcard") {
    return null;
  } else if (startAnchor.type === "block") {
    if (!metadata.blocks) return null;

    const block = metadata.blocks[startAnchor.name];
    if (!block) return null;

    const { position } = block;

    range.start = position.start.offset;
    range.end = position.end.offset;
  } else if (startAnchor.type === "header") {
    if (!metadata.headings) return null;

    const startHeadingIndex = metadata.headings.findIndex(
      ({ heading }) => githubStyleAnchoring(heading) === startAnchor.name
    );
    const startHeading = metadata.headings[startHeadingIndex];

    if (!startHeading) return null;

    range.start = startHeading.position.start.offset;
    range.startLineOffset = startAnchor.lineOffset;

    let endHeading: HeadingCache | undefined;

    if (endAnchor && endAnchor.type === "wildcard") {
      endHeading = metadata.headings?.[startHeadingIndex + 1];
    } else {
      endHeading = metadata.headings?.find(
        ({ level }, index) => index > startHeadingIndex && level === startHeading.level
      );
    }

    range.end = endHeading?.position.start.offset;
  }

  if (!endAnchor) return range;

  if (endAnchor.type === "begin") {
    return null;
  } else if (endAnchor.type === "end") {
    range.end = undefined;
  } else if (endAnchor.type === "header") {
    const heading = metadata.headings?.find(
      ({ heading }) => githubStyleAnchoring(heading) === endAnchor.name
    );
    if (!heading) return null;
    range.end = heading?.position.end.offset;
  } else if (endAnchor.type === "block") {
    const block = metadata.blocks?.[endAnchor.name];
    if (!block) return null;
    range.end = block?.position.end.offset;
  }

  return range;
}

export function refAnchorToLink(achor: RefAnchor): string {
  if (achor.type === "header") return `#${this.startAnchor.name}`;
  else if (achor.type === "block") return `#^${this.startAnchor.name}`;
  return "";
}

function githubStyleAnchoring(title: string) {
  return title
    .split(" ")
    .filter((x) => x.length > 0)
    .map((x) => x.toLowerCase())
    .join("-");
}

export interface MaybeNoteRef {
  type: "maybe-note";
  vault: DendronVault;
  note?: Note;
  path: string;
  subpath: string;
}

export interface FileRef {
  type: "file";
  file: TFile;
}

export type RefTarget = MaybeNoteRef | FileRef;

export function resolveRef(
  plugin: DendronTreePlugin,
  sourcePath: string,
  link: string
): RefTarget | null {
  const { dir: vaultDir } = parsePath(sourcePath);
  const currentVault = plugin.findVaultByParentPath(vaultDir);

  if (!currentVault) return null;

  const { path, subpath } = parseLinktext(link);
  const target = plugin.app.metadataCache.getFirstLinkpathDest(path, sourcePath);

  if (target && target.extension !== "md")
    return {
      type: "file",
      file: target,
    };

  const note = currentVault.tree.getFromFileName(path);
  return {
    type: "maybe-note",
    vault: currentVault,
    note,
    path,
    subpath,
  };
}
