import { EditorView, PluginValue, ViewUpdate } from "@codemirror/view";
import { Component, editorLivePreviewField, parseLinktext } from "obsidian";
import DendronTreePlugin from "./main";
import { parsePath } from "./path";
import { RefRenderChild, UnresolvedRefRenderChild } from "./ref-render";

interface InternalEmbedWidget {
  end: number;
  href: string;
  sourcePath: string;
  start: string;
  title: string;
  children: Component[];
  containerEl: HTMLElement;
  hacked?: boolean;

  initDOM(): HTMLElement;
  addChild(c: Component): void;
  applyTitle(container: HTMLElement, title: string): void;
}

export class RefLivePlugin implements PluginValue {
  constructor(public plugin: DendronTreePlugin) {}

  update(update: ViewUpdate) {
    if (!update.state.field(editorLivePreviewField)) {
      return;
    }

    update.view.state.facet(EditorView.decorations).forEach((d) => {
      if (typeof d !== "function") {
        const iter = d.iter();
        while (iter.value) {
          const widget = iter.value.spec.widget;
          if (widget && widget.href && widget.sourcePath && widget.title) {
            const internalWidget = widget as InternalEmbedWidget;
            hack(internalWidget, this.plugin);
          }
          iter.next();
        }
      }
    });
  }
}

function hack(widget: InternalEmbedWidget, plugin: DendronTreePlugin) {
  if (widget.hacked) {
    return;
  }
  widget.hacked = true;

  if (!widget.href) return;

  const { dir } = parsePath(widget.sourcePath);
  const currentVault = plugin.findVaultByParentPath(dir);

  if (!currentVault) return;

  const { path, subpath } = parseLinktext(widget.href);
  const target = plugin.app.metadataCache.getFirstLinkpathDest(path, widget.sourcePath);

  if (target && target.extension !== "md") return;

  const note = currentVault.tree.getFromFileName(path);

  const loadComponent = (widget: InternalEmbedWidget) => {
    if (!note || !note.file) {
      widget.addChild(
        new UnresolvedRefRenderChild(plugin.app, widget.containerEl, currentVault, path)
      );
    } else {
      const child = new RefRenderChild(
        plugin.app,
        widget.containerEl,
        note.file,
        subpath.slice(1) ?? ""
      );
      widget.addChild(child);
      child.loadFile();
      return child;
    }
  };

  widget.initDOM = function (this: InternalEmbedWidget) {
    this.containerEl = createDiv("internal-embed");
    loadComponent(this);

    return this.containerEl;
  };

  widget.applyTitle = function (this: InternalEmbedWidget, containe: HTMLElement, title: string) {
    this.title = title;
  };

  if (widget.containerEl) {
    console.log("Work around");
    widget.children[0].unload();
    widget.children.pop();
    loadComponent(widget);
  }
}
