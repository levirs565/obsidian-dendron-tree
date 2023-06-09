import { Workspace } from "obsidian";
import { anchorToLinkSubpath } from "src/engine/ref";
import { DendronWorkspace } from "src/engine/workspace";

export function createLinkOpenHandler(
  workspace: DendronWorkspace,
  originalBoundedFunction: Workspace["openLinkText"]
): Workspace["openLinkText"] {
  return async (linktext, sourcePath, newLeaf, openViewState) => {
    const target = workspace.resolveRef(sourcePath, linktext);

    if (!target || target.type !== "maybe-note")
      return originalBoundedFunction(linktext, sourcePath, newLeaf, openViewState);

    let file = target.note?.file;
    if (!file) file = await target.vault.createNote(target.path);

    let newLink = file.path;
    if (target.subpath) newLink += anchorToLinkSubpath(target.subpath.start);
    return originalBoundedFunction(newLink, "", newLeaf, openViewState);
  };
}
