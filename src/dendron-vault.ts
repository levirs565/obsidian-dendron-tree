import { App, TAbstractFile, TFile, TFolder } from "obsidian";
import { NoteTree, generateNoteTitle, getNoteTemplate, isUseTitleCase } from "./note";
import { InvalidRootModal } from "./modal/invalid-root";
import { ParsedPath } from "./utils";

export class DendronVault {
  folder: TFolder;
  tree: NoteTree;
  isIniatialized = false;

  constructor(public app: App, public path: string) {}

  init() {
    if (this.isIniatialized) return;

    this.tree = new NoteTree();

    const root = this.getFolderFile(this.path);
    if (!(root instanceof TFolder)) {
      new InvalidRootModal(this).open();
      return;
    }

    this.folder = root;

    for (const child of root.children)
      if (child instanceof TFile && this.isNote(child.extension))
        this.tree.addFile(child, this.app.metadataCache, false);

    this.tree.sort();
    this.isIniatialized = true;
  }

  async createRootFolder() {
    return await this.app.vault.createFolder(this.path);
  }

  async createNote(baseName: string) {
    const filePath = `${this.path}/${baseName}.md`;
    const notePath = NoteTree.getPathFromFileName(baseName);
    const title = generateNoteTitle(notePath[notePath.length - 1], isUseTitleCase(baseName));
    const template = getNoteTemplate(title);
    return await this.app.vault.create(filePath, template);
  }

  isNote(extension: string) {
    return extension === "md";
  }

  getFolderFile(path: string) {
    return path.length === 0
      ? this.app.vault.getRoot()
      : this.app.vault.getAbstractFileByPath(path);
  }

  onFileCreated(file: TAbstractFile): boolean {
    if (!(file instanceof TFile) || !this.isNote(file.extension)) return false;

    this.tree.addFile(file, this.app.metadataCache, true);
    return true;
  }

  onMetadataChanged(file: TFile): boolean {
    if (!this.isNote(file.extension)) return false;

    this.tree.updateMetadata(file, this.app.metadataCache);
    return true;
  }

  onFileDeleted(parsed: ParsedPath): boolean {
    if (!this.isNote(parsed.extension)) return false;

    this.tree.deleteByFileName(parsed.basename);
    return true;
  }
}
