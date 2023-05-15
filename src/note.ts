import { TAbstractFile, TFolder } from "obsidian";

export interface Note {
  name: string;
  children: Note[];
  file?: TAbstractFile;
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
    }

    let currentNote: Note = root;

    while (path.length > 0) {
      const name = path.shift()!;
      let note: Note | undefined = currentNote.children.find((note) => note.name == name);

      if (!note) {
        note = {
          name,
          children: [],
        };
        currentNote.children.push(note);
      }

      currentNote = note;
    }

    currentNote.file = file;
  });

  return root;
}
