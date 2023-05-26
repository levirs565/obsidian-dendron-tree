import { MetadataCache, TFile } from "obsidian";
import { generateUUID } from "./utils";

export class Note {
  name: string;
  children: Note[] = [];
  file?: TFile;
  parent?: Note;
  title = "";

  constructor(private originalName: string, private titlecase: boolean) {
    this.name = originalName.toLowerCase();
    this.title = generateNoteTitle(this.originalName, this.titlecase);
  }

  appendChild(note: Note) {
    if (note.parent) throw Error("Note has parent");
    note.parent = this;
    this.children.push(note);
  }

  removeChildren(note: Note) {
    note.parent = undefined;
    const index = this.children.indexOf(note);
    this.children.splice(index, 1);
  }

  findChildren(name: string) {
    const lower = name.toLowerCase();
    return this.children.find((note) => note.name == lower);
  }

  sortChildren(rescursive: boolean) {
    this.children.sort((a, b) => a.name.localeCompare(b.name));
    if (rescursive) this.children.forEach((child) => child.sortChildren(rescursive));
  }

  getPath() {
    const component: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: Note | undefined = this;
    while (current && current.name !== "root") {
      component.unshift(current.name);
      current = current.parent;
    }

    if (component.length == 0) component.push("root");

    return component.join(".");
  }

  syncMetadata(metadataCache: MetadataCache) {
    if (!this.file) return;
    const cache = metadataCache.getFileCache(this.file);
    this.title =
      cache?.frontmatter?.["title"] ?? generateNoteTitle(this.originalName, this.titlecase);
  }
}

/**
 * Check whetever generated note title must be title case or not
 * @param baseName file base name
 */

export function isUseTitleCase(baseName: string) {
  return baseName.toLowerCase() === baseName;
}

/**
 * Generate title for note
 * @param originalName name of note before lowercased (not filename)
 * @param titlecase use title case or use original name
 * @returns title for note
 */

export function generateNoteTitle(originalName: string, titlecase: boolean) {
  if (!titlecase) return originalName;
  return originalName
    .split("-")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((word) => {
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    })
    .join(" ");
}

export function getNoteTemplate(title: string) {
  const time = new Date().getTime();
  return `---
id: ${generateUUID()}
desc: ''
title: ${title}
updated: ${time}
created: ${time}
---

`;
}

export class NoteTree {
  root: Note = new Note("root", true);

  sort() {
    this.root.sortChildren(true);
  }

  public static getPathFromFileName(name: string) {
    return name.split(".");
  }

  private static isRootPath(path: string[]) {
    return path.length === 1 && path[0] === "root";
  }

  addFile(file: TFile, metadataCache: MetadataCache, sort: boolean) {
    const titlecase = isUseTitleCase(file.basename);
    const path = NoteTree.getPathFromFileName(file.basename);

    let currentNote: Note = this.root;

    if (!NoteTree.isRootPath(path))
      for (const name of path) {
        let note: Note | undefined = currentNote.findChildren(name);

        if (!note) {
          note = new Note(name, titlecase);
          currentNote.appendChild(note);
          if (sort) currentNote.sortChildren(false);
        }

        currentNote = note;
      }

    currentNote.file = file;
    currentNote.syncMetadata(metadataCache);
  }

  getFromFileName(name: string) {
    const path = NoteTree.getPathFromFileName(name);

    if (NoteTree.isRootPath(path)) return this.root;

    let currentNote: Note = this.root;

    for (const name of path) {
      const found = currentNote.findChildren(name);
      if (!found) return undefined;
      currentNote = found;
    }

    return currentNote;
  }

  deleteByFileName(name: string) {
    const note = this.getFromFileName(name);
    if (!note) return;

    note.file = undefined;
    if (note.children.length == 0) {
      let currentNote: Note | undefined = note;
      while (
        currentNote &&
        currentNote.parent &&
        !currentNote.file &&
        currentNote.children.length == 0
      ) {
        const parent: Note | undefined = currentNote.parent;
        parent.removeChildren(currentNote);
        currentNote = parent;
      }
    }
  }

  updateMetadata(file: TFile, metadataCache: MetadataCache) {
    const note = this.getFromFileName(file.basename);
    if (!note) return;
    note.syncMetadata(metadataCache);
  }

  private static *flattenInternal(root: Note): Generator<Note> {
    yield root;
    for (const child of root.children) yield* this.flattenInternal(child);
  }

  flatten() {
    return Array.from(NoteTree.flattenInternal(this.root));
  }
}
