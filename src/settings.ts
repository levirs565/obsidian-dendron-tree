import { App, PluginSettingTab, Setting } from "obsidian";
import DendronTreePlugin from "./main";

export interface DendronTreePluginSettings {
  vaultPath?: string;
  vaultList: string[];
}

export const DEFAULT_SETTINGS: DendronTreePluginSettings = {
  vaultList: [""],
};

export class DendronTreeSettingTab extends PluginSettingTab {
  plugin: DendronTreePlugin;

  constructor(app: App, plugin: DendronTreePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Dendron Tree Settting" });

    new Setting(containerEl).setName("Vault List").setHeading();
    for (const vault of this.plugin.settings.vaultList) {
      new Setting(containerEl)
        .setName(vault === "" ? "Root Folder" : `Folder: ${vault}`)
        .addButton((btn) => {
          btn.setButtonText("Remove").onClick(async () => {
            this.plugin.settings.vaultList.remove(vault);
            await this.plugin.saveSettings();
            this.display();
          });
        });
    }
    let newVault = "";
    new Setting(containerEl)
      .setName("Directory: ")
      .addText((text) => {
        text.onChange((value) => {
          newVault = value;
        });
      })
      .addButton((btn) => {
        btn.setButtonText("Add").onClick(async () => {
          const list = this.plugin.settings.vaultList;
          if (!list.includes(newVault)) {
            list.push(newVault);
            await this.plugin.saveSettings();
          }
          this.display();
        });
      });
  }
  hide() {
    super.hide();
    this.plugin.onRootFolderChanged();
  }
}
