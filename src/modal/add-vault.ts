import { App, Modal, Notice, PopoverSuggest, Setting, TFolder, TextComponent } from "obsidian";

class FolderSuggester extends PopoverSuggest<TFolder> {
  constructor(
    public app: App,
    public inputEl: HTMLInputElement,
    public onSelected: (folder: TFolder) => void
  ) {
    super(app);

    inputEl.addEventListener("input", this.onInputChange);
    inputEl.addEventListener("focus", this.onInputChange);
    inputEl.addEventListener("blur", () => this.close());
    this.suggestEl.on("mousedown", ".suggestion-item", (e) => e.preventDefault());
    this.suggestEl.classList.add("dendron-folder-suggest");
  }
  onInputChange = () => {
    const suggestionList = this.getSuggestions(this.inputEl.value);
    if (suggestionList.length === 0) {
      this.close();
      return;
    }
    this.suggestions.setSuggestions(suggestionList);
    this.open();
    this.setAutoDestroy(this.inputEl);
    this.suggestEl.style.width = `${this.inputEl.offsetWidth}px`;
    const loc = this.inputEl.getBoundingClientRect();
    this.reposition({
      left: loc.left,
      right: loc.right,
      top: loc.top,
      bottom: loc.top + this.inputEl.offsetHeight,
    });
  };
  getSuggestions(query: string) {
    const queryLowercase = query.toLowerCase();
    return this.app.vault
      .getAllLoadedFiles()
      .filter(
        (file) => file instanceof TFolder && file.path.toLowerCase().contains(queryLowercase)
      ) as TFolder[];
  }
  renderSuggestion(value: TFolder, el: HTMLElement): void {
    el.createDiv({
      text: value.path,
    });
  }
  selectSuggestion(value: TFolder, evt: MouseEvent | KeyboardEvent): void {
    this.inputEl.value = value.path;
    this.close();
    this.onSelected(value);
  }
}

export class AddVaultModal extends Modal {
  folder?: TFolder;
  nameText: TextComponent;

  constructor(app: App) {
    super(app);
  }

  onOpen(): void {
    new Setting(this.contentEl).setHeading().setName("Add Vault");
    new Setting(this.contentEl).setName("Vault Path").addText((text) => {
      new FolderSuggester(this.app, text.inputEl, (newFolder) => {
        const currentName = this.nameText.getValue();
        if (currentName.length === 0 || (this.folder && currentName === this.folder.name))
          this.nameText.setValue(newFolder.name);

        this.folder = newFolder;
      });
    });
    new Setting(this.contentEl).setName("Vault Name").addText((text) => {
      this.nameText = text;
    });
    new Setting(this.contentEl).addButton((btn) => {
      btn
        .setCta()
        .setButtonText("Add Text")
        .onClick(() => {
          if (!this.folder || this.nameText.getValue().trim().length === 0) {
            new Notice("Please specify Vault Path and Vault Name");
            return;
          }
        });
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
