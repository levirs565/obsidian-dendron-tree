import { Menu, Plugin, TAbstractFile, TFile, Vault, addIcon } from "obsidian";
import { DendronView, VIEW_TYPE_DENDRON } from "./view";
import { activeFile, dendronVaultList } from "./store";
import { LookupModal } from "./modal/lookup";
import { dendronActivityBarIcon, dendronActivityBarName } from "./icons";
import { DEFAULT_SETTINGS, DendronTreePluginSettings, DendronTreeSettingTab } from "./settings";
import { parsePath } from "./path";
import { DendronWorkspace } from "./engine/workspace";
import { CustomResolver } from "./custom-resolver";
import { DendronVault } from "./engine/vault";
import { Note } from "./engine/note";

type DendronGraphNode = {
  file: TFile;
} & (
  | {
      type: "note";
      vault: DendronVault;
      note: Note;
    }
  | {
      type: "file";
    }
);

export default class DendronTreePlugin extends Plugin {
  settings: DendronTreePluginSettings;
  workspace: DendronWorkspace = new DendronWorkspace(this.app);
  customResolver?: CustomResolver;

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

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        const view = leaf?.view;
        if (view?.getViewType() === "graph") {
          const render = view.dataEngine.render;
          view.dataEngine.render = () => {
            const filterFile = (file: string, nodeType: string) => {
              if (!view.dataEngine.searchQueries) {
                return true;
              }
              if ("" === nodeType) {
                return view.dataEngine.fileFilter.hasOwnProperty(file)
                  ? view.dataEngine.fileFilter[file]
                  : !view.dataEngine.hasFilter;
              }
              if ("attachment" !== nodeType) return true;
              return view.dataEngine.searchQueries.every(function (query) {
                return !!query.color || !!query.query.matchFilepath(file);
              });
            };

            const nodes: Record<string, any> = {};
            let numLinks = 0;

            const dendronNodeList: DendronGraphNode[] = this.workspace.vaultList.flatMap((vault) =>
              vault.tree
                .flatten()
                .filter((note) => note.file)
                .map((note) => ({
                  type: "note",
                  vault,
                  file: note.file!,
                  note,
                }))
            );

            if (view.dataEngine.options.showAttachments)
              dendronNodeList.push(
                ...this.app.vault
                  .getFiles()
                  .filter((file) =>
                    file.extension === "md" && file.parent
                      ? !this.workspace.findVaultByParent(file.parent)
                      : true
                  )
                  .map((file) => ({
                    type: "file" as const,
                    file,
                  }))
              );

            const progression = view.dataEngine.progression;

            if (progression) {
              const map = new Map<DendronGraphNode, number>();
              for (const dendronNode of dendronNodeList) {
                if (dendronNode.type === "file") {
                  map.set(
                    dendronNode,
                    Math.min(dendronNode.file.stat.ctime, dendronNode.file.stat.mtime)
                  );
                  continue;
                } else if (dendronNode.type === "note") {
                  const file = dendronNode.note.file;
                  if (!file) {
                    map.set(dendronNode, Infinity);
                  } else {
                    const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;

                    if (!metadata) map.set(dendronNode, Infinity);
                    else {
                      const created = parseInt(metadata["created"]);
                      map.set(dendronNode, isNaN(created) ? Infinity : created);
                    }
                  }
                }
              }
              dendronNodeList.sort((a, b) => map.get(a)! - map.get(b)!);
            }

            let stopFile: TFile | undefined = undefined;
            for (const dendronNode of dendronNodeList) {
              if (dendronNode.type === "note") {
                const { note, vault } = dendronNode;
                if (!filterFile(note.file?.path ?? "", "")) continue;

                const node: any = {
                  type: "",
                  links: {},
                };
                nodes[`dendron://${vault.config.name}/${note.getPath()}`] = node;

                if (view.dataEngine.options.showOrphans) {
                  if (progression && progression === numLinks) {
                    stopFile = note.file;
                  }
                  numLinks++;
                }

                if (!note.file) continue;
                const meta = this.app.metadataCache.getFileCache(note.file);
                if (!meta) continue;

                const listOfLinks = (meta.links ?? []).concat(meta.embeds ?? []);

                for (const link of listOfLinks) {
                  const href = link.original.startsWith("[[")
                    ? link.original.substring(2, link.original.length - 2).split("|", 2)[0]
                    : link.link;
                  const target = this.workspace.resolveRef(note.file.path, href);
                  if (target?.type === "maybe-note") {
                    const linkName = `dendron://${target.vaultName}/${target.path}`.toLowerCase();
                    if (!progression || numLinks < progression) {
                      if (!target.note?.file) {
                        if (!filterFile(target.note?.file?.path ?? "", "unresolved")) continue;
                        if (view.dataEngine.options.hideUnresolved) continue;
                        nodes[linkName] = {
                          type: "unresolved",
                          links: {},
                        };
                      } else {
                        if (!filterFile(target.note?.file?.path ?? "", "")) continue;
                      }

                      node.links[linkName] = true;
                    }

                    if (progression && progression === numLinks) {
                      stopFile = note.file;
                    }

                    numLinks++;
                  } else if (target && view.dataEngine.options.showAttachments) {
                    if (!progression || numLinks < progression) {
                      const linkName = target.file.path;
                      node.links[linkName] = true;
                    }

                    if (progression && progression === numLinks) {
                      stopFile = note.file;
                    }

                    numLinks++;
                  }
                }
              } else if (dendronNode.type === "file") {
                const linkName = dendronNode.file.path;
                if (view.dataEngine.options.showOrphans) {
                  if (progression && progression === numLinks) {
                    stopFile = dendronNode.file;
                  }
                  numLinks++;
                }

                const node: any = {
                  type: "attachment",
                  links: {},
                };

                if (!filterFile(linkName, "attachment")) continue;
                nodes[linkName] = node;
              }
            }
            if (progression) {
              const index = dendronNodeList.findIndex(({ file }) => file === stopFile);

              if (index >= 0) {
                for (let i = index + 1; i < dendronNodeList.length; i++) {
                  const dendronNode = dendronNodeList[i];

                  const p =
                    dendronNode.type === "note"
                      ? `dendron://${dendronNode.vault.config.name}/${dendronNode.note.getPath()}`
                      : dendronNode.file.path;
                  if (!nodes[p]) {
                    console.log(`Delete failed ${p}`);
                  }
                  delete nodes[p];
                }
              }
            }

            if (!view.dataEngine.options.showOrphans) {
              const isNodeReferenced = new Map<string, boolean>();

              for (const nodeName of Object.keys(nodes)) {
                for (const link of Object.keys(nodes[nodeName].links)) {
                  if (link === nodeName) continue;
                  isNodeReferenced.set(link, true);
                }
              }

              for (const nodeName of Object.keys(nodes)) {
                if (isNodeReferenced.get(nodeName)) continue;

                let canDelete = true;
                for (const link of Object.keys(nodes[nodeName].links)) {
                  if (link === nodeName) continue;
                  canDelete = false;
                  break;
                }

                if (canDelete) delete nodes[nodeName];
              }
            }
            view.renderer.setData({
              nodes,
              numLinks,
            });
            return numLinks;
          };
        }
      })
    );
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
