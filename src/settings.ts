import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import DendronTreePlugin from "./main";
import { VaultConfig } from "./engine/vault";
import { AddVaultModal } from "./modal/add-vault";

export interface DendronTreePluginSettings {
  /**
   * @deprecated use vaultList
   */
  vaultPath?: string;
  vaultList: VaultConfig[];
  autoGenerateFrontmatter: boolean;
  autoReveal: boolean;
  customResolver: boolean;
  customGraph: boolean;
  deleteMethod: string;
}

export const DEFAULT_SETTINGS: DendronTreePluginSettings = {
  vaultList: [
    {
      name: "root",
      path: "/",
    },
  ],
  autoGenerateFrontmatter: true,
  autoReveal: true,
  customResolver: false,
  customGraph: false,
  deleteMethod: "moveToTrash",
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
    .setName("Deletion Method")
    .setDesc(
      "What happens when you delete a file"
    )
    .addDropdown(dropdown => dropdown
      .addOption('moveToTrash', 'Move to Trash')
      .addOption('deletePermanently', 'Delete Permanently')
      .setValue(this.plugin.settings.deleteMethod || 'moveToTrash')
      .onChange(async (value) => {
        this.plugin.settings.deleteMethod = value;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Auto Generate Front Matter")
      .setDesc("Generate front matter for new file even if file is created outside of Dendron tree")
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

    new Setting(containerEl)
      .setName("Custom Graph Engine")
      .setDesc("Use custom graph engine to render graph (Experimental)")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.customGraph).onChange(async (value) => {
          this.plugin.settings.customGraph = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName("Vault List").setHeading();
    for (const vault of this.plugin.settings.vaultList) {
      new Setting(containerEl)
        .setName(vault.name)
        .setDesc(`Folder: ${vault.path}`)
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
        new AddVaultModal(this.app, (config) => {
          const list = this.plugin.settings.vaultList;
          const nameLowecase = config.name.toLowerCase();
          if (list.find(({ name }) => name.toLowerCase() === nameLowecase)) {
            new Notice("Vault with same name already exist");
            return false;
          }
          if (list.find(({ path }) => path === config.path)) {
            new Notice("Vault with same path already exist");
            return false;
          }

          list.push(config);
          this.plugin.saveSettings().then(() => this.display());
          return true;
        }).open();
      });
    });
  }
  hide() {
    super.hide();
    this.plugin.onRootFolderChanged();
    this.plugin.configureCustomResolver();
    this.plugin.configureCustomGraph();
  }
}
