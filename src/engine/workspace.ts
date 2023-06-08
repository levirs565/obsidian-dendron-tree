import { App, TFolder, parseLinktext } from "obsidian";
import { DendronVault } from "./vault";
import { getFolderFile } from "../utils";
import { RefTarget, parseRefSubpath } from "./ref";
import { parsePath } from "../path";

export class DendronWorkspace {
  vaultList: DendronVault[] = [];

  constructor(public app: App) {}

  changeVault(vaultList: string[]) {
    this.vaultList = vaultList.map((path) => {
      return (
        this.vaultList.find((vault) => vault.path === path) ?? new DendronVault(this.app, path)
      );
    });
    for (const vault of this.vaultList) {
      vault.init();
    }
  }

  findVaultByParent(parent: TFolder | null): DendronVault | undefined {
    return this.vaultList.find((vault) => vault.folder === parent);
  }

  findVaultByParentPath(path: string): DendronVault | undefined {
    const file = getFolderFile(this.app.vault, path);
    return file instanceof TFolder ? this.findVaultByParent(file) : undefined;
  }

  resolveRef(sourcePath: string, link: string): RefTarget | null {
    const { dir: vaultDir } = parsePath(sourcePath);
    const currentVault = this.findVaultByParentPath(vaultDir);

    if (!currentVault) return null;

    const { path, subpath } = parseLinktext(link);
    const target = this.app.metadataCache.getFirstLinkpathDest(path, sourcePath);

    if (target && target.extension !== "md")
      return {
        type: "file",
        file: target,
      };

    const note = currentVault.tree.getFromFileName(path);
    return {
      type: "maybe-note",
      vault: currentVault,
      note,
      path,
      subpath: parseRefSubpath(subpath),
    };
  }
}
