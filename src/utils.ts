import { App, OpenViewState, TAbstractFile, TFile, Vault } from "obsidian";
import { customAlphabet as nanoid } from "nanoid";

export function getFolderFile(vault: Vault, path: string) {
  return path.length === 0 ? vault.getRoot() : vault.getAbstractFileByPath(path);
}

export type OpenFileTarget = "new-tab" | "new-leaf" | "new-window";

export function openFile(
  app: App,
  file: TAbstractFile | undefined | null,
  props: {
    openState?: OpenViewState;
    openTarget?: OpenFileTarget;
  } = {}
) {
  if (!file || !(file instanceof TFile)) return;
  const leaf =
    props.openTarget === "new-window"
      ? app.workspace.openPopoutLeaf()
      : props.openTarget === "new-leaf"
      ? app.workspace.createLeafBySplit(app.workspace.getLeaf())
      : app.workspace.getLeaf(props.openTarget === "new-tab");
  return leaf.openFile(file, props.openState);
}

const alphanumericLowercase = "0123456789abcdefghijklmnopqrstuvwxyz";
export const generateUUID = nanoid(alphanumericLowercase, 23);
