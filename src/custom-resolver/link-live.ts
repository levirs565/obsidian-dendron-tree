import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { editorInfoField, App } from "obsidian";
import { editorLivePreviewField } from "obsidian";
import { RefTarget } from "../engine/ref";
import { DendronWorkspace } from "../engine/workspace";
import { renderLinkTitle } from "./link-render";

class LinkWidget extends WidgetType {
  containerEl: HTMLSpanElement;
  ref: RefTarget | null;

  constructor(
    public app: App,
    public workspace: DendronWorkspace,
    public sourcePath: string,
    public href: string,
    public title: string | undefined
  ) {
    super();
  }

  initDOM() {
    this.containerEl = createSpan(
      {
        cls: "cm-hmd-internal-link",
      },
      (el) => {
        el.createSpan({
          cls: "cm-underline",
        });
      }
    );
    this.updateTitle();

    this.containerEl.addEventListener("click", () => {
      this.app.workspace.openLinkText(this.href, this.sourcePath);
    });
  }
  updateTitle() {
    this.containerEl.children[0].setText(
      renderLinkTitle(this.app, this.workspace, this.href, this.title, this.sourcePath)
    );
  }
  toDOM(view: EditorView): HTMLElement {
    if (!this.containerEl) this.initDOM();
    return this.containerEl;
  }
}

interface LinkData {
  start: number;
  end: number;
  href: string;
  title: string | undefined;
  hasAlias: boolean;
  showSource: boolean;
}

export class LinkLivePlugin implements PluginValue {
  decorations: DecorationSet = Decoration.none;
  widgets: LinkWidget[] = [];

  constructor(public app: App, public workspace: DendronWorkspace, public editorView: EditorView) {
    this.decorations = this.buildDecorations(editorView);
  }

  update(update: ViewUpdate): void {
    this.decorations = this.buildDecorations(update.view);
  }

  getLinks(view: EditorView) {
    const links: LinkData[] = [];

    for (const { from, to } of view.visibleRanges) {
      let linkStart = -1;
      let linkTitle: string | undefined = undefined;
      let linkHref = "";
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node) {
          const tokenClass = node.type.prop(tokenClassNodeProp);
          if (!tokenClass) return;

          const tokenClassList = tokenClass.split(" ");
          if (
            tokenClassList.contains("formatting-link-start") &&
            !tokenClassList.contains("formatting-embed")
          ) {
            linkStart = node.from;
          } else if (linkStart >= 0) {
            if (tokenClassList.contains("hmd-internal-link")) {
              const text = view.state.doc.sliceString(node.from, node.to);
              if (tokenClassList.contains("link-has-alias")) {
                linkTitle = text;
              } else {
                linkHref = text;
              }
            } else if (tokenClassList.contains("formatting-link-end")) {
              links.push({
                start: linkStart,
                end: node.to,
                href: linkHref,
                title: linkTitle,
                hasAlias: !!linkTitle,
                showSource: true,
              });
              linkStart = -1;
              linkTitle = undefined;
              linkHref = "";
            }
          }
        },
      });
    }
    return links;
  }

  configureLinkVisibility(links: LinkData[], view: EditorView) {
    const prevDecorations = view.state.facet(EditorView.decorations);

    for (const decorFn of prevDecorations) {
      if (typeof decorFn !== "function") continue;
      const decor = decorFn(view);
      const iter = decor.iter();

      let found = false;
      while (iter.value) {
        if ((iter.value as any).isReplace) {
          const link = links.find(({ start }) => start === iter.from);
          if (link) {
            found = true;
            link.showSource = false;
            if (link.hasAlias) {
              iter.next(); // skip before pipe
              iter.next(); // skip pipe
              iter.next(); // skip after pipe
            } else {
              iter.next(); // skip text
            }

            iter.next();
          }
        }
        iter.next();
      }
      if (found) break;
    }
  }

  getWidget(link: LinkData, sourcePath: string) {
    const lastWidgetIndex = this.widgets.findIndex(
      (widget) => widget.href === link.href && widget.sourcePath === sourcePath
    );
    if (lastWidgetIndex >= 0) {
      const widget = this.widgets[lastWidgetIndex];
      widget.title = link.title;
      widget.updateTitle();

      this.widgets.splice(lastWidgetIndex, 1);

      return widget;
    }
    return new LinkWidget(this.app, this.workspace, sourcePath, link.href, link.title);
  }

  buildDecorations(view: EditorView): DecorationSet {
    if (!view.state.field(editorLivePreviewField)) {
      return Decoration.none;
    }

    const links = this.getLinks(view);
    if (links.length === 0) return Decoration.none;

    this.configureLinkVisibility(links, view);

    const builder = new RangeSetBuilder<Decoration>();
    const currentWidgets: LinkWidget[] = [];
    const sourcePath = view.state.field(editorInfoField).file?.path ?? "";

    for (const link of links) {
      if (link.showSource) continue;

      const widget = this.getWidget(link, sourcePath);
      currentWidgets.push(widget);

      builder.add(
        link.start,
        link.end,
        Decoration.widget({
          widget,
        })
      );
    }

    this.widgets = currentWidgets;

    return builder.finish();
  }
}
