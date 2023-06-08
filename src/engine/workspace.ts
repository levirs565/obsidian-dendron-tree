import { App, TFolder } from "obsidian";
import { DendronVault } from "./vault";
import { getFolderFile } from "src/utils";

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
}
