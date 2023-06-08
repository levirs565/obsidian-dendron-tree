import { HoverPopover, Menu, Plugin, PopoverState, TAbstractFile, TFile, addIcon } from "obsidian";
import { DendronView, VIEW_TYPE_DENDRON } from "./view";
import { activeFile, dendronVaultList } from "./store";
import { LookupModal } from "./modal/lookup";
import { dendronActivityBarIcon, dendronActivityBarName } from "./icons";
import { DEFAULT_SETTINGS, DendronTreePluginSettings, DendronTreeSettingTab } from "./settings";
import { parsePath } from "./path";
import { ViewPlugin } from "@codemirror/view";
import { RefLivePlugin } from "./ref-live";
import { createRefMarkdownProcessor } from "./ref-markdown-processor";
import { resolveRef } from "./ref";
import { NoteRefRenderChild, createRefRenderer } from "./ref-render";
import { DendronWorkspace } from "./engine/workspace";

export default class DendronTreePlugin extends Plugin {
  settings: DendronTreePluginSettings;
  workspace: DendronWorkspace = new DendronWorkspace(this.app);

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

      const pagePreview = this.app.internalPlugins.getEnabledPluginById("page-preview");
      if (!pagePreview) return;
      const originalLinkHover = pagePreview.onLinkHover;
      const originalLinkHoverBinded = originalLinkHover.bind(pagePreview);
      pagePreview.onLinkHover = (parent, targetEl, link, sourcePath, state) => {
        const ref = resolveRef(this, sourcePath, link);

        if (!ref || ref.type !== "maybe-note")
          return originalLinkHoverBinded(parent, targetEl, link, sourcePath, state);

        if (
          !(
            parent.hoverPopover &&
            parent.hoverPopover.state !== PopoverState.Hidden &&
            parent.hoverPopover.targetEl === targetEl
          )
        ) {
          const popOver = new HoverPopover(parent, targetEl);

          setTimeout(async () => {
            if (popOver.state === PopoverState.Hidden) return;

            const container = popOver.hoverEl.createDiv();
            const component = createRefRenderer(ref, this, container);
            popOver.addChild(component);
            if (component instanceof NoteRefRenderChild) await component.loadFile();

            if (popOver.state === PopoverState.Shown) popOver.position();
          }, 100);
        }
      };
    });

    this.registerMarkdownPostProcessor(createRefMarkdownProcessor(this));
  }

  onunload() {}

  onRootFolderChanged() {
    this.workspace.changeVault(this.settings.vaultList);
    this.updateNoteStore();
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
