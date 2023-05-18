import { Modal, Setting } from "obsidian";
import DendronTreePlugin from "./main";

export class InvalidRootModal extends Modal {
  constructor(private plugin: DendronTreePlugin) {
    super(plugin.app);
  }

  onOpen(): void {
    this.contentEl.createEl("h1", { text: "Invalid Root" });
    this.contentEl.createEl("p", {
      text: `"${this.plugin.settings.vaultPath}" is not folder. Do you want to create this folder?`,
    });
    new Setting(this.contentEl).addButton((button) => {
      button
        .setButtonText("Create")
        .setCta()
        .onClick(() => {
          this.plugin.createRootFolder().then(() => {
            this.plugin.onRootFolderChanged();
            this.close();
          });
        });
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
