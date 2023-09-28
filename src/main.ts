import { Menu, Plugin, TAbstractFile, TFile, addIcon } from "obsidian";
import { DendronView, VIEW_TYPE_DENDRON } from "./view";
import { activeFile, dendronVaultList } from "./store";
import { LookupModal } from "./modal/lookup";
import { dendronActivityBarIcon, dendronActivityBarName } from "./icons";
import { DEFAULT_SETTINGS, DendronTreePluginSettings, DendronTreeSettingTab } from "./settings";
import { parsePath } from "./path";
import { DendronWorkspace } from "./engine/workspace";
import { CustomResolver } from "./custom-resolver";
import { CustomGraph } from "./custom-graph";

export default class DendronTreePlugin extends Plugin {
  settings: DendronTreePluginSettings;
  workspace: DendronWorkspace = new DendronWorkspace(this.app);
  customResolver?: CustomResolver;
  customGraph?: CustomGraph;

  async onload() {
    await this.loadSettings();
    await this.migrateSettings();

    addIcon(dendronActivityBarName, dendronActivityBarIcon);

    this.addCommand({
      id: "dendron-lookup",
      name: "Lookup Note",
      callback: () => {
        new LookupModal(this.app, this.workspace).open();
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
      this.registerEvent(this.app.workspace.on("file-open", this.onOpenFile, this));
      this.registerEvent(this.app.workspace.on("file-menu", this.onFileMenu));
    });

    this.configureCustomResolver();
    this.configureCustomGraph();
  }

  async migrateSettings() {
    function pathToVaultConfig(path: string) {
      const { name } = parsePath(path);
      if (name.length === 0)
        return {
          name: "root",
          path: "/",
        };
      let processed = path;
      if (processed.endsWith("/")) processed = processed.slice(0, -1);
      if (processed.startsWith("/") && processed.length > 1) processed = processed.slice(1);
      return {
        name,
        path: processed,
      };
    }

    if (this.settings.vaultPath) {
      this.settings.vaultList = [pathToVaultConfig(this.settings.vaultPath)];
      this.settings.vaultPath = undefined;
      await this.saveSettings();
    }
    if (this.settings.vaultList.length > 0 && typeof this.settings.vaultList[0] === "string") {
      this.settings.vaultList = (this.settings.vaultList as unknown as string[]).map((path) =>
        pathToVaultConfig(path)
      );
      await this.saveSettings();
    }
  }

  onunload() {}

  onRootFolderChanged() {
    this.workspace.changeVault(this.settings.vaultList);
    this.updateNoteStore();
  }

  configureCustomResolver() {
    if (this.settings.customResolver && !this.customResolver) {
      this.customResolver = new CustomResolver(this, this.workspace);
      this.addChild(this.customResolver);
    } else if (!this.settings.customResolver && this.customResolver) {
      this.removeChild(this.customResolver);
      this.customResolver = undefined;
    }
  }

  configureCustomGraph() {
    if (this.settings.customGraph && !this.customGraph) {
      this.customGraph = new CustomGraph(this, this.workspace);
      this.addChild(this.customGraph);
    } else if (!this.settings.customGraph && this.customGraph) {
      this.removeChild(this.customGraph);
      this.customGraph = undefined;
    }
  }

  updateNoteStore() {
    dendronVaultList.set(this.workspace.vaultList);
  }

  onCreateFile = async (file: TAbstractFile) => {
    const vault = this.workspace.findVaultByParent(file.parent);
    if (vault && vault.onFileCreated(file)) {
      if (this.settings.autoGenerateFrontmatter && file instanceof TFile && file.stat.size === 0)
        await vault.generateFronmatter(file);
      this.updateNoteStore();
    }
  };

  onDeleteFile = (file: TAbstractFile) => {
    // file.parent is null when file is deleted
    const parsed = parsePath(file.path);
    const vault = this.workspace.findVaultByParentPath(parsed.dir);
    if (vault && vault.onFileDeleted(parsed)) {
      this.updateNoteStore();
    }
  };

  onRenameFile = (file: TAbstractFile, oldPath: string) => {
    const oldParsed = parsePath(oldPath);
    const oldVault = this.workspace.findVaultByParentPath(oldParsed.dir);
    let update = false;
    if (oldVault) {
      update = oldVault.onFileDeleted(oldParsed);
    }

    const newVault = this.workspace.findVaultByParent(file.parent);
    if (newVault) {
      update = newVault.onFileCreated(file) || update;
    }
    if (update) this.updateNoteStore();
  };

  onOpenFile(file: TFile | null) {
    activeFile.set(file);
    if (file && this.settings.autoReveal) this.revealFile(file);
  }

  onFileMenu = (menu: Menu, file: TAbstractFile) => {
    if (!(file instanceof TFile)) return;

    menu.addItem((item) => {
      item
        .setIcon(dendronActivityBarName)
        .setTitle("Reveal in Dendron Tree")
        .onClick(() => this.revealFile(file));
    });
  };

  onResolveMetadata = (file: TFile) => {
    const vault = this.workspace.findVaultByParent(file.parent);
    if (vault && vault.onMetadataChanged(file)) {
      this.updateNoteStore();
    }
  };

  revealFile(file: TFile) {
    const vault = this.workspace.findVaultByParent(file.parent);
    if (!vault) return;
    const note = vault.tree.getFromFileName(file.basename);
    if (!note) return;
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DENDRON)) {
      if (!(leaf.view instanceof DendronView)) continue;
      leaf.view.component.focusTo(vault, note);
    }
  }

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
