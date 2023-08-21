import { Component, MarkdownPreviewRenderer, PagePreviewPlugin, Plugin, Workspace } from "obsidian";
import { DendronWorkspace } from "../engine/workspace";
import { createLinkHoverHandler } from "./link-hover";
import { ViewPlugin } from "@codemirror/view";
import { RefLivePlugin } from "./ref-live";
import { createRefMarkdownProcessor } from "./ref-markdown-processor";
import { createLinkOpenHandler } from "./link-open";
import { LinkLivePlugin } from "./link-live";
import { createLinkMarkdownProcessor } from "./link-markdown-processor";
import { LinkRefClickbale } from "./link-ref-clickbale";

export class CustomResolver extends Component {
  pagePreviewPlugin?: PagePreviewPlugin;
  originalLinkHover: PagePreviewPlugin["onLinkHover"];
  originalOpenLinkText: Workspace["openLinkText"];
  refPostProcessor = createRefMarkdownProcessor(this.plugin.app, this.workspace);
  linkPostProcessor = createLinkMarkdownProcessor(this.plugin.app, this.workspace);
  refEditorExtenstion = ViewPlugin.define((v) => {
    return new RefLivePlugin(this.plugin.app, this.workspace);
  });
  linkEditorExtenstion = ViewPlugin.define(
    (view) => {
      return new LinkLivePlugin(this.plugin.app, this.workspace, view);
    },
    {
      decorations: (value) => value.decorations,
    }
  );
  linkRefClickbaleExtension = ViewPlugin.define((v) => {
    return new LinkRefClickbale(v);
  });

  constructor(public plugin: Plugin, public workspace: DendronWorkspace) {
    super();
  }

  onload(): void {
    this.plugin.app.workspace.onLayoutReady(() => {
      this.plugin.app.workspace.registerEditorExtension(this.refEditorExtenstion);
      this.plugin.app.workspace.registerEditorExtension(this.linkEditorExtenstion);
      this.plugin.app.workspace.registerEditorExtension(this.linkRefClickbaleExtension);

      this.pagePreviewPlugin = this.plugin.app.internalPlugins.getEnabledPluginById("page-preview");
      if (!this.pagePreviewPlugin) return;

      this.originalLinkHover = this.pagePreviewPlugin.onLinkHover;
      this.pagePreviewPlugin.onLinkHover = createLinkHoverHandler(
        this.plugin.app,
        this.workspace,
        this.originalLinkHover.bind(this.pagePreviewPlugin)
      );
    });

    MarkdownPreviewRenderer.registerPostProcessor(this.refPostProcessor);
    MarkdownPreviewRenderer.registerPostProcessor(this.linkPostProcessor);

    this.originalOpenLinkText = this.plugin.app.workspace.openLinkText;
    this.plugin.app.workspace.openLinkText = createLinkOpenHandler(
      this.workspace,
      this.originalOpenLinkText.bind(this.plugin.app.workspace)
    );
  }

  onunload(): void {
    this.plugin.app.workspace.openLinkText = this.originalOpenLinkText;
    MarkdownPreviewRenderer.unregisterPostProcessor(this.linkPostProcessor);
    MarkdownPreviewRenderer.unregisterPostProcessor(this.refPostProcessor);
    this.plugin.app.workspace.unregisterEditorExtension(this.linkRefClickbaleExtension);
    this.plugin.app.workspace.unregisterEditorExtension(this.linkEditorExtenstion);
    this.plugin.app.workspace.unregisterEditorExtension(this.refEditorExtenstion);

    if (!this.pagePreviewPlugin) return;
    this.pagePreviewPlugin.onLinkHover = this.originalLinkHover;
  }
}
