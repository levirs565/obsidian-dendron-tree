import { App, PluginSettingTab, Setting } from "obsidian";
import DendronTreePlugin from "./main";

export interface DendronTreePluginSettings {
  /**
   * @deprecated use vaultList
   */
  vaultPath?: string;
  vaultList: string[];
  autoGenerateFrontmatter: boolean;
  autoReveal: boolean;
}

export const DEFAULT_SETTINGS: DendronTreePluginSettings = {
  vaultList: [""],
  autoGenerateFrontmatter: true,
  autoReveal: true,
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

    new Setting(containerEl)
      .setName("Auto Generate Fronmatter")
      .setDesc("Generate fronmatter for new file even if file is created outside of Dendron tree")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoGenerateFrontmatter).onChange(async (value) => {
          this.plugin.settings.autoGenerateFrontmatter = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Auto Reveal")
      .setDesc("Automatically reveal active file in Dendron Tree")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoReveal).onChange(async (value) => {
          this.plugin.settings.autoReveal = value;
          await this.plugin.saveSettings();
        });
      });

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
