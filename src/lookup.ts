import { SuggestModal, getIcon } from "obsidian";
import { Note, createNote, generateNoteTitle, getNotePath } from "./note";
import { getRootNote } from "./store";
import { openFile } from "./utils";

function* flattenNote(root: Note): Generator<Note> {
  yield root;
  for (const child of root.children) yield* flattenNote(child);
}

let pendingQuery = "";

export function setPendingLookupQuery(q: string) {
  pendingQuery = q;
}

function usePendingLookupQuery() {
  const result = pendingQuery;
  pendingQuery = "";
  return result;
}

export class LookupModal extends SuggestModal<Note | null> {
  onOpen(): void {
    super.onOpen();
    const query = usePendingLookupQuery();
    if (query.length > 0) {
      this.inputEl.value = query;
      this.inputEl.dispatchEvent(new Event("input"));
    }
  }

  getSuggestions(query: string): (Note | null)[] {
    const queryLowercase = query.toLowerCase();
    const notes = flattenNote(getRootNote());
    const result: (Note | null)[] = [];
    let foundExact = false;
    for (const note of notes) {
      const path = getNotePath(note);
      if (path === query) {
        foundExact = true;
        result.unshift(note);
        continue;
      }
      if (
        note.title.toLowerCase().includes(queryLowercase) ||
        note.name.toLowerCase().includes(queryLowercase) ||
        path.includes(queryLowercase)
      )
        result.push(note);
    }

    if (!foundExact && query.trim().length > 0) result.unshift(null);

    return result;
  }
  renderSuggestion(note: Note | null, el: HTMLElement) {
    el.classList.add("mod-complex");
    el.createEl("div", { cls: "suggestion-content" }, (el) => {
      el.createEl("div", { text: note?.title ?? "Create New", cls: "suggestion-title" });
      el.createEl("small", {
        text: note ? getNotePath(note) : "Note does not exist",
        cls: "suggestion-content",
      });
    });
    if (!note || !note.file)
      el.createEl("div", { cls: "suggestion-aux" }, (el) => {
        el.append(getIcon("plus")!);
      });
  }
  onChooseSuggestion(note: Note | null, evt: MouseEvent | KeyboardEvent) {
    if (note && note.file) {
      openFile(this.app, note.file);
      return;
    }

    const path = note ? getNotePath(note) : this.inputEl.value;
    const title = note ? note.title : generateNoteTitle(path);
    createNote(this.app.vault, path, title).then((fileName) => {
      return openFile(this.app, this.app.vault.getAbstractFileByPath(fileName));
    });
  }
}
