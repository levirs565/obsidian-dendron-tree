import { App, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, addIcon } from "obsidian";
import { DendronView, VIEW_TYPE_DENDRON } from "./view";
import { activeFile, rootNote } from "./store";
import { NoteTree } from "./note";
import { LookupModal } from "./lookup";
import { dendronActivityBarIcon, dendronActivityBarName } from "./icons";
import parsePath from "path-parse";

interface DendronTreePluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: DendronTreePluginSettings = {
  mySetting: "default",
};

export default class DendronTreePlugin extends Plugin {
  settings: DendronTreePluginSettings;
  tree: NoteTree = new NoteTree();

  async onload() {
    await this.loadSettings();

    addIcon(dendronActivityBarName, dendronActivityBarIcon);

    this.addCommand({
      id: "dendron-lookup",
      name: "Lookup Note",
      hotkeys: [{ modifiers: ["Ctrl"], key: "l" }],
      callback: () => {
        new LookupModal(this).open();
      },
    });

    this.addSettingTab(new SampleSettingTab(this.app, this));

    this.registerView(VIEW_TYPE_DENDRON, (leaf) => new DendronView(leaf, this));

    this.addRibbonIcon(dendronActivityBarName, "Open Dendron Tree", () => {
      this.activateView();
    });

    this.updateNoteStore();

    this.registerEvent(this.app.vault.on("create", this.onCreateFile));
    this.registerEvent(this.app.vault.on("delete", this.onDeleteFile));
    this.registerEvent(this.app.vault.on("rename", this.onRenameFile));
    this.registerEvent(this.app.metadataCache.on("resolve", this.onResolveMetadata));
    this.registerEvent(this.app.workspace.on("file-open", this.onOpenFile));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DENDRON);
  }

  updateNoteStore() {
    rootNote.set(this.tree.root);
  }

  isNoteFile(file: TAbstractFile): file is TFile {
    return file instanceof TFile && file.extension === "md";
  }

  onCreateFile = (file: TAbstractFile) => {
    if (this.isNoteFile(file)) {
      this.tree.addFile(file, true);
      this.updateNoteStore();
    }
  };

  onDeleteFile = (file: TAbstractFile) => {
    if (this.isNoteFile(file)) {
      this.tree.deleteByFileName(file.basename);
      this.updateNoteStore();
    }
  };

  onRenameFile = (file: TAbstractFile, oldPath: string) => {
    if (this.isNoteFile(file)) {
      const oldFile = parsePath(oldPath);
      this.tree.deleteByFileName(oldFile.name);
      this.tree.addFile(file, true);
      this.updateNoteStore();
    }
  };

  onOpenFile = (file: TFile) => {
    activeFile.set(file);
  };

  onResolveMetadata = (file: TFile) => {
    if (this.isNoteFile(file)) {
      this.tree.updateMetadata(file, this.app.metadataCache);
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

class SampleSettingTab extends PluginSettingTab {
  plugin: DendronTreePlugin;

  constructor(app: App, plugin: DendronTreePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

    new Setting(containerEl)
      .setName("Setting #1")
      .setDesc("It's a secret")
      .addText((text) =>
        text
          .setPlaceholder("Enter your secret")
          .setValue(this.plugin.settings.mySetting)
          .onChange(async (value) => {
            console.log("Secret: " + value);
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
