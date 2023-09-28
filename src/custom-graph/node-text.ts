import { GraphNode } from "obsidian";
import { DENDRON_URI_START, DendronWorkspace } from "src/engine/workspace";

export function createNodeTextHandler(workspace: DendronWorkspace): GraphNode["getDisplayText"] {
  return function (this: GraphNode): string {
    const id = this.id;
    if (id.startsWith(DENDRON_URI_START)) {
      const ref = workspace.resolveRef("", id);
      if (!ref || ref.type === "file") return id;

      const title = ref.note?.title ?? ref.path;
      if (workspace.vaultList.length > 1) return `${title} (${ref.vaultName})`;

      return title;
    }
    return id;
  };
}
