import { App, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile } from "obsidian";
import { DendronView, VIEW_TYPE_DENDRON } from "./view";
import { rootNote } from "./store";
import { addNoteToTree, createNoteTree, deleteNoteFromTree, updateNoteMetadata } from "./note";
import { LookupModal } from "./lookup";

// Remember to rename these classes and interfaces!

interface DendronTreePluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: DendronTreePluginSettings = {
  mySetting: "default",
};

export default class DendronTreePlugin extends Plugin {
  settings: DendronTreePluginSettings;

  async onload() {
    await this.loadSettings();

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon("dice", "Sample Plugin", (evt: MouseEvent) => {
      // Called when the user clicks the icon.
      new Notice("This is a notice!");
    });
    // Perform additional things with the ribbon
    ribbonIconEl.addClass("my-plugin-ribbon-class");

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText("Status Bar Text");

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: "dendron-lookup",
      name: "Lookup Note",
      hotkeys: [{ modifiers: ["Ctrl"], key: "l" }],
      callback: () => {
        new LookupModal(this.app).open();
      },
    });

    this.addSettingTab(new SampleSettingTab(this.app, this));

    this.registerView(VIEW_TYPE_DENDRON, (leaf) => new DendronView(leaf, this));

    this.addRibbonIcon("dice", "Activate view", () => {
      this.activateView();
    });

    rootNote.set(createNoteTree(this.app.vault.getRoot()));

    this.app.vault.on("create", this.onCreateFile);
    this.app.vault.on("delete", this.onDeleteFile);
    this.app.vault.on("rename", this.onRenameFile);
    this.app.metadataCache.on("resolve", this.onResolveMetadata);
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DENDRON);
    this.app.vault.off("create", this.onCreateFile);
    this.app.vault.off("delete", this.onDeleteFile);
    this.app.vault.off("rename", this.onRenameFile);
    this.app.metadataCache.off("resolve", this.onResolveMetadata);
  }

  onCreateFile = (file: TAbstractFile) => {
    rootNote.update((note) => {
      if (file.name.endsWith(".md")) {
        addNoteToTree(note, file, true);
      }
      return note;
    });
  };

  onDeleteFile = (file: TAbstractFile) => {
    rootNote.update((note) => {
      if (file.name.endsWith(".md")) deleteNoteFromTree(note, file.name);
      return note;
    });
  };

  onRenameFile = (file: TAbstractFile, oldPath: string) => {
    rootNote.update((note) => {
      if (file.name.endsWith(".md")) {
        const oldName = oldPath.split("/").pop()!.split("\\").pop()!;
        deleteNoteFromTree(note, oldName);
        addNoteToTree(note, file, true);
      }

      return note;
    });
  };

  onResolveMetadata = (file: TFile) => {
    rootNote.update((note) => {
      if (file.name.endsWith(".md")) {
        updateNoteMetadata(note, file, this.app.metadataCache);
      }
      return note;
    });
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
