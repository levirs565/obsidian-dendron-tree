import { CachedMetadata, HeadingCache, TFile } from "obsidian";
import { Note } from "./note";
import { DendronVault } from "./vault";
import GithubSlugger from "github-slugger";

export interface MaybeNoteRef {
  type: "maybe-note";
  vaultName: string;
  vault?: DendronVault;
  note?: Note;
  path: string;
  subpath?: RefSubpath;
}

export interface FileRef {
  type: "file";
  file: TFile;
}

export type RefTarget = MaybeNoteRef | FileRef;

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

export interface RefSubpath {
  text: string;
  start: RefAnchor;
  end?: RefAnchor;
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

function findHeadingByGithubSlug(headings: HeadingCache[], name: string) {
  const slugger = new GithubSlugger();
  const index = headings.findIndex(({ heading }) => slugger.slug(heading) === name);
  return {
    index,
    heading: headings[index],
  };
}

export function getRefContentRange(subpath: RefSubpath, metadata: CachedMetadata): RefRange | null {
  const range: RefRange = {
    start: 0,
    startLineOffset: 0,
    end: undefined,
  };

  const { start, end } = subpath;

  if (start.type === "begin") {
    range.start = 0;
    range.end = metadata.headings?.[0].position.start.offset;
  } else if (start.type === "end" || start.type === "wildcard") {
    return null;
  } else if (start.type === "block") {
    if (!metadata.blocks) return null;

    const block = metadata.blocks[start.name];
    if (!block) return null;

    const { position } = block;

    range.start = position.start.offset;
    range.end = position.end.offset;
  } else if (start.type === "header") {
    if (!metadata.headings) return null;

    const { index: startHeadingIndex, heading: startHeading } = findHeadingByGithubSlug(
      metadata.headings,
      start.name
    );

    if (!startHeading) return null;

    range.start = startHeading.position.start.offset;
    range.startLineOffset = start.lineOffset;

    let endHeading: HeadingCache | undefined;

    if (end && end.type === "wildcard") {
      endHeading = metadata.headings?.[startHeadingIndex + 1];
    } else {
      endHeading = metadata.headings?.find(
        ({ level }, index) => index > startHeadingIndex && level <= startHeading.level
      );
    }

    range.end = endHeading?.position.start.offset;
  }

  if (!end) return range;

  if (end.type === "begin") {
    return null;
  } else if (end.type === "end") {
    range.end = undefined;
  } else if (end.type === "header") {
    if (!metadata.headings) return null;
    const { heading } = findHeadingByGithubSlug(metadata.headings, end.name);
    if (!heading) return null;
    range.end = heading?.position.end.offset;
  } else if (end.type === "block") {
    const block = metadata.blocks?.[end.name];
    if (!block) return null;
    range.end = block?.position.end.offset;
  }

  return range;
}

export function anchorToLinkSubpath(
  anchor: RefAnchor,
  headings: HeadingCache[] | undefined
): string | null {
  if (anchor.type === "header") {
    let name = anchor.name;
    if (headings) {
      const { heading } = findHeadingByGithubSlug(headings, name);
      if (heading) {
        name = heading.heading;
      }
    }
    return `#${name}`;
  } else if (anchor.type === "block") return `#^${anchor.name}`;
  return "";
}

export function parseRefSubpath(str: string): RefSubpath | undefined {
  if (str.length > 0) {
    const [startStr, endStr] = str.split(":#", 2);
    const start = parseRefAnchor(startStr);

    let end: RefAnchor | undefined;
    if (endStr) end = parseRefAnchor(endStr);
    return {
      text: str,
      start,
      end,
    };
  }
  return undefined;
}
