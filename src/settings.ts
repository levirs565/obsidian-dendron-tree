import { App, PluginSettingTab, Setting } from "obsidian";
import DendronTreePlugin from "./main";
import { AddVaultModal } from "./modal/add-vault";

export interface DendronTreePluginSettings {
  /**
   * @deprecated use vaultList
   */
  vaultPath?: string;
  vaultList: string[];
  autoGenerateFrontmatter: boolean;
  autoReveal: boolean;
  customResolver: boolean;
}

export const DEFAULT_SETTINGS: DendronTreePluginSettings = {
  vaultList: [""],
  autoGenerateFrontmatter: true,
  autoReveal: true,
  customResolver: false,
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

    new Setting(containerEl)
      .setName("Custom Resolver")
      .setDesc(
        "Use custom resolver to resolve ref/embed and link. (Please reopen editor after change this setting)"
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.customResolver).onChange(async (value) => {
          this.plugin.settings.customResolver = value;
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
    new Setting(containerEl).addButton((btn) => {
      btn.setButtonText("Add Vault").onClick(() => {
        new AddVaultModal(this.app).open();
      });
    });
  }
  hide() {
    super.hide();
    this.plugin.onRootFolderChanged();
    this.plugin.configureCustomResolver();
  }
}
