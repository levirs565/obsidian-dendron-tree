import { App, HoverPopover, PagePreviewPlugin, PopoverState } from "obsidian";
import { DendronWorkspace } from "src/engine/workspace";
import { NoteRefRenderChild, createRefRenderer } from "./ref-render";

export function createLinkHoverHandler(
  app: App,
  workspace: DendronWorkspace,
  originalBoundedFunction: PagePreviewPlugin["onLinkHover"]
): PagePreviewPlugin["onLinkHover"] {
  return (parent, targetEl, link, sourcePath, state) => {
    const ref = workspace.resolveRef(sourcePath, link);

    if (!ref || ref.type !== "maybe-note")
      return originalBoundedFunction(parent, targetEl, link, sourcePath, state);

    if (
      !(
        parent.hoverPopover &&
        parent.hoverPopover.state !== PopoverState.Hidden &&
        parent.hoverPopover.targetEl === targetEl
      )
    ) {
      const popOver = new HoverPopover(parent, targetEl);

      setTimeout(async () => {
        if (popOver.state === PopoverState.Hidden) return;

        const container = popOver.hoverEl.createDiv();
        const component = createRefRenderer(ref, app, container);
        popOver.addChild(component);
        if (component instanceof NoteRefRenderChild) await component.loadFile();

        if (popOver.state === PopoverState.Shown) popOver.position();
      }, 100);
    }
  };
}
