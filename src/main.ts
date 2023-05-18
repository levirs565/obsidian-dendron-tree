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
import { activeFile, rootNote } from "./store";
import { NoteTree, generateNoteTitle, getNoteTemplate } from "./note";
import { LookupModal } from "./lookup";
import { dendronActivityBarIcon, dendronActivityBarName } from "./icons";
import parsePath from "path-parse";
import { InvalidRootModal } from "./invalid-root";

interface DendronTreePluginSettings {
  vaultPath: string;
}

const DEFAULT_SETTINGS: DendronTreePluginSettings = {
  vaultPath: "",
};

export default class DendronTreePlugin extends Plugin {
  settings: DendronTreePluginSettings;
  tree: NoteTree;
  rootFolder: TFolder;

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

    this.addSettingTab(new DendronTreeSettingTab(this.app, this));

    this.registerView(VIEW_TYPE_DENDRON, (leaf) => new DendronView(leaf, this));

    this.addRibbonIcon(dendronActivityBarName, "Open Dendron Tree", () => {
      this.activateView();
    });

    this.app.workspace.onLayoutReady(() => {
      this.onRootFolderChanged();
    });

    this.registerEvent(this.app.vault.on("create", this.onCreateFile));
    this.registerEvent(this.app.vault.on("delete", this.onDeleteFile));
    this.registerEvent(this.app.vault.on("rename", this.onRenameFile));
    this.registerEvent(this.app.metadataCache.on("resolve", this.onResolveMetadata));
    this.registerEvent(this.app.workspace.on("file-open", this.onOpenFile));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DENDRON);
  }

  async createNote(dendronPath: string) {
    const path = `${this.settings.vaultPath}/${dendronPath}.md`;
    const title = generateNoteTitle(dendronPath);
    const template = getNoteTemplate(title);
    return await this.app.vault.create(path, template);
  }

  async createRootFolder() {
    return await this.app.vault.createFolder(this.settings.vaultPath);
  }

  getFolderFile(path: string) {
    return path.length === 0
      ? this.app.vault.getRoot()
      : this.app.vault.getAbstractFileByPath(path);
  }

  onRootFolderChanged() {
    const root = this.getFolderFile(this.settings.vaultPath);

    if (this.rootFolder === root) return;

    this.tree = new NoteTree();

    if (!(root instanceof TFolder)) {
      new InvalidRootModal(this).open();
      this.updateNoteStore();
      return;
    }

    this.rootFolder = root;

    for (const child of root.children)
      if (this.isNoteFile(child)) this.tree.addFile(child, this.app.metadataCache, false);

    this.tree.sort();
    this.updateNoteStore();
  }

  updateNoteStore() {
    rootNote.set(this.tree.root);
  }

  isNote({ parent, ext }: { parent: TFolder | null; ext: string }) {
    return parent === this.rootFolder && ext === "md";
  }

  isNoteFile(file: TAbstractFile): file is TFile {
    return file instanceof TFile && this.isNote({ parent: file.parent, ext: file.extension });
  }

  isNotePath(parsed: ReturnType<typeof parsePath>) {
    const parent = this.getFolderFile(parsed.dir);
    return parent instanceof TFolder && this.isNote({ parent, ext: parsed.ext.substring(1) });
  }

  onCreateFile = (file: TAbstractFile) => {
    if (this.isNoteFile(file)) {
      this.tree.addFile(file, this.app.metadataCache, true);
      this.updateNoteStore();
    }
  };

  onDeleteFile = (file: TAbstractFile) => {
    // file.parent is null when file is deleted
    const parsed = parsePath(file.path);
    if (this.isNotePath(parsed)) {
      this.tree.deleteByFileName(parsed.name);
      this.updateNoteStore();
    }
  };

  onRenameFile = (file: TAbstractFile, oldPath: string) => {
    const oldParsed = parsePath(oldPath);
    let update = false;
    if (this.isNotePath(oldParsed)) {
      this.tree.deleteByFileName(oldParsed.name);
      update = true;
    }
    if (this.isNoteFile(file)) {
      this.tree.addFile(file, this.app.metadataCache, true);
      update = true;
    }
    if (update) this.updateNoteStore();
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

    new Setting(containerEl).setName("Vault Path").addText((text) =>
      text.setValue(this.plugin.settings.vaultPath).onChange(async (value) => {
        this.plugin.settings.vaultPath = value;
        await this.plugin.saveSettings();
      })
    );
  }
  hide() {
    super.hide();
    this.plugin.onRootFolderChanged();
  }
}
