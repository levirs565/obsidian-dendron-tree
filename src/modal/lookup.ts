import { SuggestModal, getIcon } from "obsidian";
import { Note } from "../note";
import { openFile } from "../utils";
import DendronTreePlugin from "../main";

export class LookupModal extends SuggestModal<Note | null> {
  constructor(private plugin: DendronTreePlugin, private initialQuery: string = "") {
    super(plugin.app);
  }

  onOpen(): void {
    super.onOpen();
    if (this.initialQuery.length > 0) {
      this.inputEl.value = this.initialQuery;
      this.inputEl.dispatchEvent(new Event("input"));
    }
  }

  getSuggestions(query: string): (Note | null)[] {
    const queryLowercase = query.toLowerCase();
    const notes = this.plugin.tree.flatten();
    const result: (Note | null)[] = [];
    let foundExact = false;
    for (const note of notes) {
      const path = note.getPath();
      if (path === query) {
        foundExact = true;
        result.unshift(note);
        continue;
      }
      if (
        note.title.toLowerCase().includes(queryLowercase) ||
        note.name.includes(queryLowercase) ||
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
        text: note ? note.getPath() : "Note does not exist",
        cls: "suggestion-content",
      });
    });
    if (!note || !note.file)
      el.createEl("div", { cls: "suggestion-aux" }, (el) => {
        el.append(getIcon("plus")!);
      });
  }
  async onChooseSuggestion(note: Note | null, evt: MouseEvent | KeyboardEvent) {
    if (note && note.file) {
      openFile(this.app, note.file);
      return;
    }

    const path = note ? note.getPath() : this.inputEl.value;
    const file = await this.plugin.createNote(path);
    return openFile(this.app, file);
  }
}
