import { TFolder } from "obsidian";

export interface Note {
  name: string;
  children: Note[];
}

export function createNoteTree(folder: TFolder) {
  const notes: Note[] = [];
  folder.children.forEach((file) => {
    if (!file.name.endsWith(".md")) return;

    const path = file.name.split(".");
    path.pop();

    let currentNotes: Note[] = notes;

    while (path.length > 0) {
      const name = path.shift()!;
      let note: Note | undefined = currentNotes.find((note) => note.name == name);

      if (!note) {
        note = {
          name,
          children: [],
        };
        currentNotes.push(note);
      }

      currentNotes = note.children;
    }
  });

  return notes;
}
