import { Menu, Plugin, TAbstractFile, TFile, TFolder, addIcon, parseLinktext } from "obsidian";
import { DendronView, VIEW_TYPE_DENDRON } from "./view";
import { activeFile, dendronVaultList } from "./store";
import { LookupModal } from "./modal/lookup";
import { dendronActivityBarIcon, dendronActivityBarName } from "./icons";
import { getFolderFile } from "./utils";
import { DendronVault } from "./dendron-vault";
import { DEFAULT_SETTINGS, DendronTreePluginSettings, DendronTreeSettingTab } from "./settings";
import { parsePath } from "./path";
import { UnresolvedRefRenderChild, RefRenderChild } from "./ref-render";
import { ViewPlugin } from "@codemirror/view";
import { RefLivePlugin } from "./ref-live";

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
      // this.registerEditorExtension(myStateField);
      this.onRootFolderChanged();
      this.registerEditorExtension(
        ViewPlugin.define((v) => {
          return new RefLivePlugin(this);
        })
      );

      this.registerEvent(this.app.vault.on("create", this.onCreateFile));
      this.registerEvent(this.app.vault.on("delete", this.onDeleteFile));
      this.registerEvent(this.app.vault.on("rename", this.onRenameFile));
      this.registerEvent(this.app.metadataCache.on("resolve", this.onResolveMetadata));
      this.registerEvent(this.app.workspace.on("file-open", this.onOpenFile));
      this.registerEvent(this.app.workspace.on("file-menu", this.onFileMenu));
    });

    this.registerMarkdownPostProcessor((element, context) => {
      const { dir } = parsePath(context.sourcePath);
      const currentVault = this.findVaultByParentPath(dir);

      if (!currentVault) return;

      const embeddedItems = element.querySelectorAll(".internal-embed");
      const promises: Promise<void>[] = [];
      embeddedItems.forEach((el) => {
        const link = el.getAttribute("src");
        if (!link) return;

        const { path, subpath } = parseLinktext(link);
        const target = this.app.metadataCache.getFirstLinkpathDest(path, context.sourcePath);

        if (target && target.extension !== "md") return;

        const note = currentVault.tree.getFromFileName(path);

        if (!note || !note.file) {
          context.addChild(
            new UnresolvedRefRenderChild(this.app, el as HTMLElement, currentVault, path)
          );
          return;
        }

        const child = new RefRenderChild(
          this.app,
          el as HTMLElement,
          note.file,
          subpath.slice(1) ?? ""
        );
        promises.push(child.loadFile());
        context.addChild(child);
      });
      return Promise.all(promises);
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
    const file = getFolderFile(this.app.vault, path);
    return file instanceof TFolder ? this.findVaultByParent(file) : undefined;
  }

  onCreateFile = async (file: TAbstractFile) => {
    const vault = this.findVaultByParent(file.parent);
    if (vault && vault.onFileCreated(file)) {
      if (this.settings.autoGenerateFrontmatter && file instanceof TFile && file.stat.size === 0)
        await vault.generateFronmatter(file);
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
      update = newVault.onFileCreated(file) || update;
    }
    if (update) this.updateNoteStore();
  };

  onOpenFile = (file: TFile) => {
    activeFile.set(file);
    if (this.settings.autoReveal) this.revealFile(file);
  };

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
    const vault = this.findVaultByParent(file.parent);
    if (vault && vault.onMetadataChanged(file)) {
      this.updateNoteStore();
    }
  };

  revealFile(file: TFile) {
    const vault = this.findVaultByParent(file.parent);
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
