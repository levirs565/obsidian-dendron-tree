import { App, Modal, Setting } from "obsidian";

export class CreateNoteWarning extends Modal {
  constructor(
    app: App,
    private path: string,
    private doCreate: (omitRoot: boolean) => Promise<void>
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl("h1", { text: "Warning" });
    this.contentEl.createEl("p", {
      text: `You are going to create note with path "${this.path}". This note's path start with "root.". This maybe mistake. Are you want to omit "root." from your path?`,
    });
    new Setting(this.contentEl)
      .addButton((button) => {
        button
          .setButtonText("Yes")
          .setCta()
          .onClick(async () => {
            await this.doCreate(true);
            this.close();
          });
      })
      .addButton((button) => {
        button.setButtonText("No").onClick(async () => {
          await this.doCreate(false);
          this.close();
        });
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}
