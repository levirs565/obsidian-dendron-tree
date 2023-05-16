import { MetadataCache, TAbstractFile, TFile, TFolder, Vault } from "obsidian";

export interface Note {
  name: string;
  children: Note[];
  file?: TAbstractFile;
  parent?: Note;
  title: string;
}

export function createNoteTree(folder: TFolder) {
  const root: Note = {
    name: "root",
    children: [],
    title: "Root",
  };
  folder.children.forEach((file) => {
    if (!file.name.endsWith(".md")) return;
    addNoteToTree(root, file, false);
  });

  sortNote(root, true);

  return root;
}

function getPathFromFileName(name: string) {
  const path = name.split(".");
  path.pop();
  return path;
}

function isRootPath(path: string[]) {
  return path.length === 1 && path[0] === "root";
}

export function addNoteToTree(root: Note, file: TAbstractFile, sort: boolean) {
  const path = getPathFromFileName(file.name);

  let currentNote: Note = root;

  if (!isRootPath(path))
    while (path.length > 0) {
      const name = path.shift()!;
      let note: Note | undefined = currentNote.children.find((note) => note.name == name);

      if (!note) {
        note = {
          name,
          children: [],
          parent: currentNote,
          title: generateNoteTitle(name),
        };
        currentNote.children.push(note);
        if (sort) sortNote(currentNote, false);
      }

      currentNote = note;
    }

  currentNote.file = file;
}

export function sortNote(note: Note, rescursive: boolean) {
  note.children.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  if (rescursive) note.children.forEach((child) => sortNote(child, rescursive));
}

export function getNoteFromFile(root: Note, name: string) {
  const path = getPathFromFileName(name);

  if (isRootPath(path)) return root;

  let currentNote: Note | undefined = root;

  while (path.length > 0) {
    const name = path.shift()!;
    currentNote = currentNote?.children.find((note) => note.name == name);
  }

  return currentNote;
}

function removeBlankNote(startNote: Note) {
  let note: Note | undefined = startNote;
  while (note && note.parent && !note.file) {
    const index = note.parent.children.indexOf(note);
    note.parent.children.splice(index, 1);
    note = note.parent;
  }
}

export function deleteNoteFromTree(root: Note, name: string) {
  const note = getNoteFromFile(root, name);
  if (!note) return;

  note.file = undefined;
  if (note.children.length == 0) {
    removeBlankNote(note);
  }
}

export function updateNoteMetadata(root: Note, file: TFile, metadataCache: MetadataCache) {
  const note = getNoteFromFile(root, file.name);
  if (!note) return;
  const cache = metadataCache.getFileCache(file);
  note.title = cache?.frontmatter?.["title"] ?? generateNoteTitle(note.name);
}

export function getNotePath(note: Note) {
  const component: string[] = [];

  let current: Note | undefined = note;
  while (current && current.name !== "root") {
    component.unshift(current.name);
    current = current.parent;
  }

  if (component.length == 0) component.push("root");

  return component.join(".");
}

export function generateNoteTitle(path: string) {
  return path
    .substring(path.lastIndexOf(".") + 1)
    .split("-")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((word) => {
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    })
    .join(" ");
}

export async function createNote(vault: Vault, path: string, title: string) {
  const fileName = `${path}.md`;
  const time = new Date().getTime();
  const frontmatter = `---
title: "${title}"
updated: ${time}
created: ${time}
---

  `;
  await vault.create(fileName, frontmatter);
  return fileName;
}
