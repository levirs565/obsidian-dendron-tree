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

const alphanumericLowercase = "0123456789abcdefghijklmnopqrstuvwxyz";
export const generateUUID = nanoid(alphanumericLowercase, 23);
