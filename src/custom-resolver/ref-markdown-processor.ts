import { DendronWorkspace } from "../engine/workspace";
import { NoteRefRenderChild, createRefRenderer } from "./ref-render";
import { App, MarkdownPostProcessor } from "obsidian";

export function createRefMarkdownProcessor(
  app: App,
  workspace: DendronWorkspace
): MarkdownPostProcessor {
  return (element, context) => {
    const embeddedItems = element.querySelectorAll(".internal-embed");
    const promises: Promise<void>[] = [];
    embeddedItems.forEach((el) => {
      const link = el.getAttribute("src");
      if (!link) return;

      const target = workspace.resolveRef(context.sourcePath, link);
      if (!target || target.type !== "maybe-note") return;

      const renderer = createRefRenderer(target, app, el as HTMLElement);
      if (renderer instanceof NoteRefRenderChild) promises.push(renderer.loadFile());

      context.addChild(renderer);
    });
    return Promise.all(promises);
  };
}
