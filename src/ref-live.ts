import { EditorView, PluginValue, ViewUpdate } from "@codemirror/view";
import { Component, editorLivePreviewField } from "obsidian";
import DendronTreePlugin from "./main";
import { NoteRefRenderChild, createRefRenderer } from "./ref-render";
import { resolveRef } from "./ref";

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
            this.hack(internalWidget);
          }
          iter.next();
        }
      }
    });
  }

  hack(widget: InternalEmbedWidget) {
    if (widget.hacked) {
      return;
    }
    widget.hacked = true;

    const plugin = this.plugin;
    const target = resolveRef(plugin, widget.sourcePath, widget.href);

    if (!target || target.type !== "maybe-note") return;

    const loadComponent = (widget: InternalEmbedWidget) => {
      const renderer = createRefRenderer(target, plugin, widget.containerEl);
      if (renderer instanceof NoteRefRenderChild) renderer.loadFile();
      widget.addChild(renderer);
    };

    widget.initDOM = function (this: InternalEmbedWidget) {
      this.containerEl = createDiv("internal-embed");
      loadComponent(this);
      return this.containerEl;
    };

    widget.applyTitle = function (
      this: InternalEmbedWidget,
      container: HTMLElement,
      title: string
    ) {
      this.title = title;
    };

    if (widget.containerEl) {
      widget.children[0].unload();
      widget.children.pop();
      loadComponent(widget);
    }
  }
}
