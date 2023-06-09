import { Modal, Setting } from "obsidian";
import { DendronVault } from "../engine/vault";

export class InvalidRootModal extends Modal {
  constructor(private dendronVault: DendronVault) {
    super(dendronVault.app);
  }

  onOpen(): void {
    this.contentEl.createEl("h1", { text: "Invalid Root" });
    this.contentEl.createEl("p", {
      text: `"${this.dendronVault.config.path}" is not folder. Do you want to create this folder?`,
    });
    new Setting(this.contentEl).addButton((button) => {
      button
        .setButtonText("Create")
        .setCta()
        .onClick(async () => {
          await this.dendronVault.createRootFolder();
          this.dendronVault.init();
          this.close();
        });
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
