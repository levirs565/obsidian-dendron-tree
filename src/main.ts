import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  TAbstractFile,
  TFile,
  TFolder,
  addIcon,
} from "obsidian";
import { DendronView, VIEW_TYPE_DENDRON } from "./view";
import { activeFile, dendronVaultList } from "./store";
import { LookupModal } from "./modal/lookup";
import { dendronActivityBarIcon, dendronActivityBarName } from "./icons";
import { parsePath } from "./utils";
import { DendronVault } from "./dendron-vault";

interface DendronTreePluginSettings {
  vaultPath?: string;
  vaultList: string[];
}

const DEFAULT_SETTINGS: DendronTreePluginSettings = {
  vaultList: [""],
};

export default class DendronTreePlugin extends Plugin {
  settings: DendronTreePluginSettings;
  vaultList: DendronVault[] = [];

  async onload() {
    await this.loadSettings();
    if (this.settings.vaultPath) {
      this.settings.vaultList = [this.settings.vaultPath];
      this.settings.vaultPath = undefined;
      await this.saveSettings();
    }

    addIcon(dendronActivityBarName, dendronActivityBarIcon);

    this.addCommand({
      id: "dendron-lookup",
      name: "Lookup Note",
      hotkeys: [{ modifiers: ["Ctrl"], key: "l" }],
      callback: () => {
        new LookupModal(this).open();
      },
    });

    this.addSettingTab(new DendronTreeSettingTab(this.app, this));

    this.registerView(VIEW_TYPE_DENDRON, (leaf) => new DendronView(leaf, this));

    this.addRibbonIcon(dendronActivityBarName, "Open Dendron Tree", () => {
      this.activateView();
    });

    this.app.workspace.onLayoutReady(() => {
      this.onRootFolderChanged();

      this.registerEvent(this.app.vault.on("create", this.onCreateFile));
      this.registerEvent(this.app.vault.on("delete", this.onDeleteFile));
      this.registerEvent(this.app.vault.on("rename", this.onRenameFile));
      this.registerEvent(this.app.metadataCache.on("resolve", this.onResolveMetadata));
      this.registerEvent(this.app.workspace.on("file-open", this.onOpenFile));
    });
  }

  onunload() {}

  onRootFolderChanged() {
    this.vaultList = this.settings.vaultList.map((path) => {
      return (
        this.vaultList.find((vault) => vault.path === path) ?? new DendronVault(this.app, path)
      );
    });
    for (const vault of this.vaultList) {
      vault.init();
    }
    this.updateNoteStore();
  }

  updateNoteStore() {
    dendronVaultList.set(this.vaultList);
  }

  findVaultByParent(parent: TFolder | null): DendronVault | undefined {
    return this.vaultList.find((vault) => vault.folder === parent);
  }

  findVaultByParentPath(path: string): DendronVault | undefined {
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFolder ? this.findVaultByParent(file) : undefined;
  }

  onCreateFile = (file: TAbstractFile) => {
    const vault = this.findVaultByParent(file.parent);
    if (vault && vault.onFileCreated(file)) {
      this.updateNoteStore();
    }
  };

  onDeleteFile = (file: TAbstractFile) => {
    // file.parent is null when file is deleted
    const parsed = parsePath(file.path);
    const vault = this.findVaultByParentPath(parsed.dir);
    if (vault && vault.onFileDeleted(parsed)) {
      this.updateNoteStore();
    }
  };

  onRenameFile = (file: TAbstractFile, oldPath: string) => {
    const oldParsed = parsePath(oldPath);
    const oldVault = this.findVaultByParentPath(oldParsed.dir);
    let update = false;
    if (oldVault) {
      update = oldVault.onFileDeleted(oldParsed);
    }

    const newVault = this.findVaultByParent(file.parent);
    if (newVault) {
      update = update || newVault.onFileCreated(file);
    }
    if (update) this.updateNoteStore();
  };

  onOpenFile = (file: TFile) => {
    activeFile.set(file);
  };

  onResolveMetadata = (file: TFile) => {
    const vault = this.findVaultByParent(file.parent);
    if (vault && vault.onMetadataChanged(file)) {
      this.updateNoteStore();
    }
  };

  async activateView() {
    const leafs = this.app.workspace.getLeavesOfType(VIEW_TYPE_DENDRON);
    if (leafs.length == 0) {
      const leaf = this.app.workspace.getLeftLeaf(false);
      await leaf.setViewState({
        type: VIEW_TYPE_DENDRON,
        active: true,
      });
      this.app.workspace.revealLeaf(leaf);
    } else {
      leafs.forEach((leaf) => this.app.workspace.revealLeaf(leaf));
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class DendronTreeSettingTab extends PluginSettingTab {
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
