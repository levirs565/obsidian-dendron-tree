import { App, TAbstractFile, TFile, Vault } from "obsidian";
import { customAlphabet as nanoid } from "nanoid";

export function getFolderFile(vault: Vault, path: string) {
  return path.length === 0 ? vault.getRoot() : vault.getAbstractFileByPath(path);
}

export function openFile(app: App, file: TAbstractFile | undefined | null) {
  if (!file || !(file instanceof TFile)) return;
  const leaf = app.workspace.getLeaf();
  leaf.openFile(file);
}

export interface ParsedPath {
  /**
   * parent directory name (if exist)
   */
  dir: string;
  /**
   * name with extension
   */
  name: string;
  /**
   *  name without extension
   */
  basename: string;
  /**
   * extension
   */
  extension: string;
}

const lastSeparatorRegex = /[/\\](?!.*[/\\])/g;
const lastPeriodRegex = /\.(?!.*\.)/g;

export function parsePath(path: string): ParsedPath {
  const pathComponent = path.split(lastSeparatorRegex);
  let dir = "";
  let name;

  if (pathComponent.length == 2) [dir, name] = pathComponent;
  else [name] = pathComponent;

  const nameComponent = name.split(lastPeriodRegex);
  const basename = nameComponent[0];
  let extension = "";
  if (nameComponent.length > 1) extension = nameComponent[1];

  return {
    dir,
    name,
    basename,
    extension,
  };
}

const alphanumericLowercase = "0123456789abcdefghijklmnopqrstuvwxyz";
export const generateUUID = nanoid(alphanumericLowercase, 23);
