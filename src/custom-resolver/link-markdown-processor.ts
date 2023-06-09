import { App, MarkdownPostProcessor } from "obsidian";
import { DendronWorkspace } from "../engine/workspace";
import { renderLinkTitle } from "./link-render";

export function createLinkMarkdownProcessor(
  app: App,
  workspace: DendronWorkspace
): MarkdownPostProcessor {
  return (el, ctx) => {
    console.log();
    const linksEl = el.querySelectorAll(".internal-link");

    if (linksEl.length == 0) return;

    const section = ctx.getSectionInfo(el);
    const cache = app.metadataCache.getCache(ctx.sourcePath);

    if (!section || !cache?.links) return;

    const links = cache.links.filter(
      (link) =>
        link.position.start.line >= section.lineStart && link.position.end.line <= section.lineEnd
    );

    if (links.length !== linksEl.length) {
      console.warn("Cannot post process link");
      return;
    }

    linksEl.forEach((el, index) => {
      const link = links[index];
      if (!link.original.startsWith("[[") || !link.original.endsWith("]]")) return;

      let title: string | undefined, href: string;
      const split = link.original.substring(2, link.original.length - 2).split("|", 2);
      if (split.length == 1) href = split[0];
      else {
        title = split[0];
        href = split[1];
      }

      const titleText = renderLinkTitle(app, workspace, href, title, ctx.sourcePath);
      el.setText(titleText);
      el.setAttribute("href", href);
    });
  };
}
