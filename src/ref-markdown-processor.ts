import DendronTreePlugin from "./main";
import { NoteRefRenderChild, createRefRenderer } from "./ref-render";
import { resolveRef } from "./ref";
import { MarkdownPostProcessor } from "obsidian";

export const createRefMarkdownProcessor: (plugin: DendronTreePlugin) => MarkdownPostProcessor =
  (plugin) => (element, context) => {
    const embeddedItems = element.querySelectorAll(".internal-embed");
    const promises: Promise<void>[] = [];
    embeddedItems.forEach((el) => {
      const link = el.getAttribute("src");
      if (!link) return;

      const target = resolveRef(plugin, context.sourcePath, link);
      if (!target || target.type !== "maybe-note") return;

      const renderer = createRefRenderer(target, plugin, el as HTMLElement);
      if (renderer instanceof NoteRefRenderChild) promises.push(renderer.loadFile());

      context.addChild(renderer);
    });
    return Promise.all(promises);
  };
