import { App, TAbstractFile, TFile } from "obsidian";

export function openFile(app: App, file: TAbstractFile | undefined | null) {
  if (!file || !(file instanceof TFile)) return;
  const leaf = app.workspace.getLeaf();
  leaf.openFile(file);
}
