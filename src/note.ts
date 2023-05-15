import { TAbstractFile, TFolder, Vault } from "obsidian";

export interface Note {
  name: string;
  children: Note[];
  file?: TAbstractFile;
  parent?: Note;
}

export function createNoteTree(folder: TFolder) {
  const root: Note = {
    name: "root",
    children: [],
  };
  folder.children.forEach((file) => {
    if (!file.name.endsWith(".md")) return;

    const path = file.name.split(".");
    path.pop();

    if (path.length === 1 && path[0] === "root") {
      root.file = file;
      return;
    }

    let currentNote: Note = root;

    while (path.length > 0) {
      const name = path.shift()!;
      let note: Note | undefined = currentNote.children.find((note) => note.name == name);

      if (!note) {
        note = {
          name,
          children: [],
          parent: currentNote,
        };
        currentNote.children.push(note);
      }

      currentNote = note;
    }

    currentNote.file = file;
  });

  return root;
}

export function getNotePath(note: Note) {
  const component: string[] = [];

  let current: Note | undefined = note;
  while (current && current.name !== "root") {
    component.unshift(current.name);
    current = current.parent;
  }

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
  const time = new Date().getTime()
  const frontmatter = `---
title: "${title}"
updated: ${time}
created: ${time}
---

  `;
  await vault.create(fileName, frontmatter);
  return fileName;
}
